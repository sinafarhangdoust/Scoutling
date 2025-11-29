import time
from celery import Celery
from sqlmodel import Session, select
from backend.database.init_db import engine
from backend.database.models import Job, JobAnalysis, UserProfile

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
    with Session(engine) as session:
        # 1. Get the user profile (instructions/resume)
        user = session.get(UserProfile, user_id)
        if not user:
            return "User not found"

        # 2. Find jobs that haven't been analyzed yet for this user
        # (Naive approach: select jobs not in JobAnalysis)
        # For simplicity in this step, let's just grab all jobs
        # In production, use a NOT EXISTS query
        all_jobs = session.exec(select(Job)).all()

        processed_count = 0

        for job in all_jobs:
            # Check if analysis exists
            existing = session.exec(
                select(JobAnalysis)
                .where(JobAnalysis.job_id == job.id)
                .where(JobAnalysis.user_id == user.id)
            ).first()

            if existing:
                continue

            # --- SIMULATE LLM CALL HERE ---
            # In real life, you call your LLM function here
            time.sleep(1)  # Fake processing delay
            is_relevant = "python" in job.title.lower()  # Fake logic
            reason = "Title contains Python" if is_relevant else "Not a match"
            # ------------------------------

            # Save Analysis
            analysis = JobAnalysis(
                job_id=job.id,
                user_id=user.id,
                is_relevant=is_relevant,
                relevancy_reason=reason
            )
            session.add(analysis)
            processed_count += 1

        session.commit()
        return f"Analyzed {processed_count} new jobs."