from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from schemas import JobSearchParamsInput, UserInstructionsInput, ResumeInput
from backend.linkedin.linkedin_wrapper import LinkedinWrapper, Job
from backend.platform.user_settings import save_instructions, save_resume, load_instructions, load_resume
from backend.database.init_db import init_db, get_session
from backend.database.models import Job, UserProfile
from backend.queue.worker import analyze_jobs_task

# TODO: implement authentication for the APIs


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    linkedin_wrapper = LinkedinWrapper()
    yield
    await linkedin_wrapper.close_connection()


# --- App Definition ---
app = FastAPI(
    title="LinkedIn Jobs API",
    description="API to search jobs using the LinkedinWrapper",
    version="0.0.1",
    lifespan=lifespan
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


@app.post("/jobs/filter")
def trigger_analysis(session: Session = Depends(get_session)):
    # 1. Ensure we have a user profile (create default if missing for single-user mode)
    user = session.exec(select(UserProfile)).first()
    if not user:
        user = UserProfile(resume_text="", filter_instructions="")
        session.add(user)
        session.commit()
        session.refresh(user)

    # 2. Trigger the Celery Task
    # .delay() is how you send it to the background
    task = analyze_jobs_task.delay(user.id)

    return {"message": "Analysis started", "task_id": task.id}

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
async def load_user_instructions():
    try:
        return load_instructions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/instructions", response_model=None, tags=['User'])
async def save_user_instructions(params: UserInstructionsInput):
    try:
        save_instructions(instructions=params.instructions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/resume", response_model=str, tags=['User'])
async def load_user_instructions():
    try:
        return load_resume()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/resume", response_model=None, tags=['User'])
async def save_user_resume(params: ResumeInput):
    try:
        save_resume(resume=params.resume)
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