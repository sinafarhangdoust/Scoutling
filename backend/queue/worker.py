import asyncio
import json
import time
from celery import Celery
from sqlmodel import Session, select

from backend.platform.user_settings import load_resume, load_instructions
from backend.database.init_db import engine
from backend.database.models import Job, JobAnalysis, UserProfile
from backend.database.utils import insert_jobs
from backend.linkedin import LinkedinWrapper
from backend.utils import run_async
from backend.agents.job_short_lister.shortlist_jobs import shortlist_jobs

# Setup Celery
# Broker: Redis (for queueing tasks)
# Backend: Redis (for storing results if needed, though we write to Postgres)
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)


@celery_app.task(name="analyze_jobs_task")
def analyze_jobs_task(user_id: int):
    """
    Background task to analyze un-analyzed jobs using LLM.
    """
    linkedin_wrapper = LinkedinWrapper()
    # get new jobs from Linkedin
    with open('/Users/sinsin/projects/Scoutling/backend/jobs.json') as f:
        all_jobs = json.load(f)
    all_jobs = [Job(**job) for job in all_jobs]

    with Session(engine) as session:

        # insert the jobs that just retrieved from Linkedin
        insert_jobs(jobs=all_jobs, session=session)

        # 1. Get the user profile (instructions/resume)
        user = session.get(UserProfile, user_id)
        user.job_titles=["Machine Learning Engineer"]
        user.job_countries=["Denmark"]
        user.resume_text = load_resume()
        user.filter_instructions = load_instructions()
        if not user:
            return "User not found"

        # get all the jobs
        all_jobs = session.exec(select(Job)).all()

        processed_count = 0
        jobs_to_process = []
        for job in all_jobs:
            # Check if analysis exists
            existing = session.exec(
                select(JobAnalysis)
                .where(JobAnalysis.job_id == job.id)
                .where(JobAnalysis.user_id == user.id)
            ).first()

            if existing:
                continue

            jobs_to_process.append(job)

        filtered_jobs = run_async(
            shortlist_jobs(
                jobs=jobs_to_process[:2],
                user_instructions=user.filter_instructions,
            )
        )
        for job in filtered_jobs:
            # Save Analysis
            analysis = JobAnalysis(
                job_id=job.id,
                user_id=user.id,
                is_relevant=True,
                relevancy_reason="Potentially relevant"
            )
            session.add(analysis)
            processed_count += 1

        session.commit()
        return f"Analyzed {processed_count} new jobs."

if __name__ == '__main__':
    analyze_jobs_task(1)