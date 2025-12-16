import json
from typing import List
from datetime import datetime
from pathlib import Path

from celery import Celery
from sqlmodel import select

from backend.database.init_db import get_session
from backend.database.models import JobAnalysis, UserProfile, Job, AnalysisStatus
from backend.database.utils import insert_jobs, get_user
from backend.linkedin import LinkedinWrapper
from backend.utils import run_async
from backend.agents.job_short_lister.shortlist_jobs import shortlist_jobs
from backend.agents.job_filterer.filter_jobs import filter_jobs
from backend.config import logger

# Setup Celery
# Broker: Redis (for queueing tasks)
# Backend: Redis (for storing results if needed, though we write to Postgres)
celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

def get_all_jobs(
    linkedin_wrapper: LinkedinWrapper,
    job_titles: List[str],
    job_countries: List[str],
    time_filter: int = None
) -> List[Job]:
    all_jobs = []
    for title in job_titles:
        for country in job_countries:
            jobs = run_async(
                linkedin_wrapper.get_all_jobs_details(
                    keywords=title,
                    location=country,
                    time_filter=time_filter,
                )
            )
            all_jobs.extend(jobs)

    # convert to correct job format from the DB
    all_jobs = [Job(**job.model_dump()) for job in all_jobs]
    return all_jobs


async def async_analysis_pipeline(user, jobs_to_process):
    logger.info("Starting to shortlist jobs")
    jobs_shortlist = await shortlist_jobs(
        jobs=jobs_to_process[:10],
        user_instructions=user.filter_instructions,
    )
    logger.info("Successfully finished shortlisting jobs")
    
    logger.info("Starting to filter jobs")
    return await filter_jobs(
        jobs=jobs_shortlist,
        user_instructions=user.filter_instructions,
        resume=user.resume_text,
    )

@celery_app.task(name="analyze_jobs_task")
def analyze_jobs_task(user_email: str):
    """
    Background task to analyze un-analyzed jobs using LLM.
    """

    logger.info(f"Retrieving user with email {user_email}")
    session = get_session()
    processed_count = 0
    try:
        user = get_user(
            email="scoutling@scoutling.com",
            session=session
        )
        if not user:
            logger.warning(f"No user with email {user_email}")
            return "User not found"

        # Make sure status reflects reality
        user.analysis_status = AnalysisStatus.IN_PROGRESS
        if not user.analysis_started_at:
            user.analysis_started_at = datetime.utcnow()
        session.add(user)
        session.commit()

        if not user.job_titles and not user.job_countries:
            logger.warning(f"no countries and job titles are set for the user {user.name}")
            user.analysis_status = AnalysisStatus.COMPLETED
            user.analysis_task_id = None
            user.analysis_started_at = None
            session.add(user)
            session.commit()
            return f"Analyzed {processed_count} new jobs."

        linkedin_wrapper = LinkedinWrapper()

        # retrieve the jobs since the last job search
        time_filter = None
        if user.last_job_search:
            time_filter = (datetime.utcnow() - user.last_job_search).seconds

        user.last_job_search = datetime.utcnow()
        session.add(user)

        # get all the jobs from Linkedin
        logger.info(f"Starting to retrieve jobs from linkedin in the timespan of {time_filter}")
        all_linkedin_jobs = get_all_jobs(
            linkedin_wrapper=linkedin_wrapper,
            job_titles=user.job_titles,
            job_countries=user.job_countries,
            time_filter=time_filter
        )
        if len(all_linkedin_jobs) == 0:
            logger.warning(f"no jobs found on linked for {user.name} in timespan of {time_filter} seconds")
            user.analysis_status = AnalysisStatus.COMPLETED
            user.analysis_task_id = None
            user.analysis_started_at = None
            session.add(user)
            session.commit()
            return f"Analyzed {processed_count} new jobs."

        # insert the jobs that just retrieved from Linkedin
        insert_jobs(jobs=all_linkedin_jobs, session=session)

        logger.info("Starting to retrieve all the jobs from database")
        all_db_jobs = session.exec(select(Job)).all()

        jobs_to_process = []
        for job in all_db_jobs:
            # Check if analysis exists
            existing = session.exec(
                select(JobAnalysis)
                .where(JobAnalysis.job_id == job.id)
                .where(JobAnalysis.user_id == user.id)
            ).first()

            if existing:
                continue

            jobs_to_process.append(job)

        # Run both steps in a single async event loop to prevent connection issues
        filtered_jobs, relevancy_reasons = run_async(
            async_analysis_pipeline(user, jobs_to_process)
        )
        
        logger.info("Successfully finished filtering jobs")
        for job, relevancy_reason in zip(filtered_jobs, relevancy_reasons):
            # Save Analysis
            analysis = JobAnalysis(
                job_id=job.id,
                user_id=user.id,
                is_relevant=True,
                relevancy_reason=relevancy_reason,
            )
            session.add(analysis)
            processed_count += 1

        session.commit()
        user.analysis_status = AnalysisStatus.COMPLETED
        user.analysis_task_id = None
        user.analysis_started_at = None
        session.add(user)
        session.commit()
        return f"Analyzed {processed_count} new jobs."
    except Exception as exc:
        user = get_user(
            email="scoutling@scoutling.com",
            session=session
        )
        if user:
            user.analysis_status = AnalysisStatus.FAILED
            user.analysis_task_id = None
            user.analysis_started_at = None
            session.add(user)
            session.commit()
        raise exc
    finally:
        session.close()

if __name__ == '__main__':
    analyze_jobs_task(user_email='scoutling@scoutling.com')