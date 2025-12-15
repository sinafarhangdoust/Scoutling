from typing import List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, create_engine
from celery.result import AsyncResult

from backend.APIs.schemas import JobSearchParamsInput, UserInstructionsInput, ResumeInput, Job, FilteredJob
from backend.linkedin.linkedin_wrapper import LinkedinWrapper
from backend.database.models import JobAnalysis, AnalysisStatus
from backend.database.models import Job as JobTable
from backend.database.utils import get_user, insert_resume, insert_user_instructions
from backend.queue.worker import analyze_jobs_task, celery_app
from backend.constants import DATABASE_ENDPOINT

# TODO: implement authentication for the APIs

db_engine = create_engine(DATABASE_ENDPOINT, echo=False)

def get_db_session():
    """Dependency for FastAPI Endpoints"""
    with Session(db_engine) as session:
        yield session

# --- App Definition ---
app = FastAPI(
    title="LinkedIn Jobs API",
    description="API to search jobs using the LinkedinWrapper",
    version="0.0.1",
)

# --- CORS Configuration---
origins = [
    "http://localhost:5173"
    "http://localhost:3000",
    "http://localhost:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Endpoints ---

@app.get("/", tags=["Health Check"])
async def root():
    return {"message": "OK"}


@app.get("/jobs/list", response_model=List[Job], tags=["Jobs"])
async def get_jobs(params: JobSearchParamsInput = Depends()):
    """
    Get jobs on LinkedIn without details.
    """
    try:
        linkedin_wrapper = LinkedinWrapper()
        jobs = await linkedin_wrapper.get_jobs(
            keywords=params.keywords,
            location=params.location,
            start=params.start,
            n_jobs=params.limit,
            time_filter=params.time_filter,
            sort_by=params.sort_by
        )
        if not jobs:
            return []

        return jobs

    except KeyError:
        raise HTTPException(
            status_code=400,
            detail=f"Location '{params.location}' is not supported."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs/details", response_model=List[Job], tags=["Jobs"])
async def get_jobs_details(params: JobSearchParamsInput = Depends()):
    """
    Get jobs on LinkedIn without details.
    """
    try:
        linkedin_wrapper = LinkedinWrapper()
        jobs = await linkedin_wrapper.get_jobs_details(
            keywords=params.keywords,
            location=params.location,
            start=params.start,
            n_jobs=params.limit,
            time_filter=params.time_filter,
            sort_by=params.sort_by
        )
        if not jobs:
            return []

        return jobs

    except KeyError:
        raise HTTPException(
            status_code=400,
            detail=f"Location '{params.location}' is not supported."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/jobs/filter", response_model=dict, tags=["Jobs"])
def trigger_analysis(db_session: Session = Depends(get_db_session)):

    user = get_user(
        email="scoutling@scoutling.com",
        session=db_session
    )
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Prevent duplicate runs if one is already in progress
    if user.analysis_task_id:
        existing_task = AsyncResult(user.analysis_task_id, app=celery_app)
        # blocked states: PENDING, STARTED, RETRY
        if existing_task.state in {"PENDING", "STARTED", "RETRY"}:
            raise HTTPException(
                status_code=409,
                detail="Analysis already running"
            )

    task = analyze_jobs_task.delay(user.email)
    user.analysis_task_id = task.id
    user.analysis_status = AnalysisStatus.IN_PROGRESS
    user.analysis_started_at = datetime.utcnow()
    db_session.add(user)
    db_session.commit()

    return {"message": "Analysis started", "task_id": task.id}


@app.get("/jobs/filter/status", response_model=dict, tags=["Jobs"])
def get_analysis_status(db_session: Session = Depends(get_db_session)):
    user = get_user(
        email="scoutling@scoutling.com",
        session=db_session
    )
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    celery_state: Optional[str] = None
    if user.analysis_task_id:
        result = AsyncResult(user.analysis_task_id, app=celery_app)
        celery_state = result.state

    return {
        "status": user.analysis_status,
        "task_id": user.analysis_task_id,
        "celery_state": celery_state,
        "started_at": user.analysis_started_at.isoformat() if user.analysis_started_at else None
    }

@app.get("/jobs/filter", response_model=List[FilteredJob], tags=["Jobs"])
def get_filtered_jobs(db_session: Session = Depends(get_db_session)):
    # Assuming that the app is single user

    user = get_user(
        email="scoutling@scoutling.com",
        session=db_session
    )
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    statement = (
        select(JobTable, JobAnalysis)
        .join(JobAnalysis)
        .where(JobAnalysis.job_id == JobTable.id)
        .where(JobAnalysis.user_id == user.id)
        .order_by(JobAnalysis.analyzed_at.desc())
    )
    results = db_session.exec(statement).all()
    filtered_jobs = []
    for job, analysis in results:
        filtered_jobs.append(FilteredJob(
            id=job.id,
            linkedin_job_id=job.linkedin_job_id,
            title=job.title,
            company=job.company,
            location=job.location,
            url=job.url,
            description=job.description,
            relevant=analysis.is_relevant,
            relevancy_reason=analysis.relevancy_reason,
            applied=analysis.applied,
        ))

    return filtered_jobs

@app.get("/job/details", response_model=Job, tags=["Jobs"])
async def get_job_details(params: Job = Depends()):

    linkedin_wrapper = LinkedinWrapper()
    try:
        return await linkedin_wrapper.get_job_info(
            job=params,
            random_wait=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/instructions", response_model=str, tags=['User'])
async def load_user_instructions(db_session: Session = Depends(get_db_session)):
    try:
        user = get_user(
            email="scoutling@scoutling.com",
            session=db_session
        )
        return user.filter_instructions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/instructions", response_model=None, tags=['User'])
async def save_user_instructions(
          params: UserInstructionsInput,
          db_session: Session = Depends(get_db_session)
):
    try:
        user = get_user(
            email="scoutling@scoutling.com",
            session=db_session
        )
        insert_user_instructions(
            user=user,
            user_instructions=params.instructions,
            session=db_session
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/resume", response_model=str, tags=['User'])
async def load_user_resume(db_session: Session = Depends(get_db_session)):
    try:
        user = get_user(
            email="scoutling@scoutling.com",
            session=db_session
        )
        return user.resume_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/resume", response_model=None, tags=['User'])
async def save_user_resume(
          params: ResumeInput,
          db_session: Session = Depends(get_db_session)
):
    try:
        user = get_user(
            email="scoutling@scoutling.com",
            session=db_session
        )
        insert_resume(
            user=user,
            resume=params.resume,
            session=db_session
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        workers=1,
    )
