import json
from typing import List

from celery import Celery
from sqlmodel import Session, select

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
    job_countries: List[str]
) -> List[Job]:
    # TODO: fix this function to properly retrieve all the available jobs
    all_jobs = []
    for title in job_titles:
        for country in job_countries:
            jobs = run_async(
                linkedin_wrapper.get_jobs_details(
                    keywords=title,
                    location=country,
                    n_jobs=50,
                )
            )
            all_jobs.extend(jobs)
    return all_jobs


@celery_app.task(name="analyze_jobs_task")
def analyze_jobs_task(user: UserProfile):
    """
    Background task to analyze un-analyzed jobs using LLM.
    """

    processed_count = 0
    if not user:
        return "User not found"

    # TODO: remove this later on as it needs to be saved to the user
    user.job_titles = ["Machine Learning Engineer"]
    user.job_countries = ["Denmark"]

    if not user.job_titles and not user.job_countries:
        logger.warning(f"no countries and job titles are set for the user {user}")
        return f"Analyzed {processed_count} new jobs."


    linkedin_wrapper = LinkedinWrapper()
    session = get_session()
    # TODO: to do this more efficiently we need to add an attribute to the user which tracks when was the last time the looked for jobs and can set the time filter based on that
    # get all the jobs from Linkedin
    with open('../jobs.json') as f:
        all_linkedin_jobs = json.load(f)
    all_linkedin_jobs = [Job(**job) for job in all_linkedin_jobs]
    # all_linkedin_jobs = get_all_jobs(
    #     linkedin_wrapper=linkedin_wrapper,
    #     job_titles=user.job_titles,
    #     job_countries=user.job_countries
    # )

    # insert the jobs that just retrieved from Linkedin
    insert_jobs(jobs=all_linkedin_jobs, session=session)

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

    filtered_jobs = run_async(
        shortlist_jobs(
            jobs=jobs_to_process,
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
    user = get_user(email='scoutling@scoutling.com', session=get_session())
    analyze_jobs_task(user=user)