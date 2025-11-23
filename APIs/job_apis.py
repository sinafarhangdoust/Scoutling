from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware

from linkedin.linkedin_wrapper import LinkedinWrapper, Job
from schemas import JobSearchParamsInput


@asynccontextmanager
async def lifespan(app: FastAPI):
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        workers=1,
    )