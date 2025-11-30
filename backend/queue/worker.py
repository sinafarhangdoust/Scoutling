from typing import List
from datetime import datetime

from celery import Celery
from sqlmodel import select

from backend.database.init_db import get_session
from backend.database.models import JobAnalysis, UserProfile, Job
from backend.database.utils import insert_jobs, get_user
from backend.linkedin import LinkedinWrapper
from backend.utils import run_async
from backend.agents.job_short_lister.shortlist_jobs import shortlist_jobs
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
    # TODO: fix this function to properly retrieve all the available jobs
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


@celery_app.task(name="analyze_jobs_task")
def analyze_jobs_task(user_email: str):
    """
    Background task to analyze un-analyzed jobs using LLM.
    """

    logger.info(f"Retrieving user with email {user_email}")
    session = get_session()
    user = get_user(
        email="scoutling@scoutling.com",
        session=session
    )
    processed_count = 0
    if not user:
        logger.warning(f"No user with email {user_email}")
        return "User not found"

    # TODO: remove this later on as it needs to be saved to the user
    user.job_titles = ["Machine Learning Engineer"]
    user.job_countries = ["Denmark"]

    if not user.job_titles and not user.job_countries:
        logger.warning(f"no countries and job titles are set for the user {user.name}")
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
        return f"Analyzed {processed_count} new jobs."

    # insert the jobs that just retrieved from Linkedin
    all_linkedin_jobs = [job for job  in all_linkedin_jobs]
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

    logger.info("Starting to shortlist jobs")
    filtered_jobs = run_async(
        shortlist_jobs(
            jobs=jobs_to_process,
            user_instructions=user.filter_instructions,
        )
    )
    logger.info("Successfully finished shortlisting jobs")
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
    analyze_jobs_task(user_email='scoutling@scoutling.com')