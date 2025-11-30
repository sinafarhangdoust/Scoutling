from typing import List

from sqlmodel import Session, select

from backend.linkedin.linkedin_wrapper import Job as LinkedInJob
from backend.database.models import Job as JobTable, UserProfile
from backend.config import logger

def get_user(
    email: str,
    session:Session
) -> UserProfile:

    user = session.exec(select(UserProfile).where(UserProfile.email == email)).first()
    user: UserProfile

    return user

def insert_jobs(
    jobs: List[LinkedInJob],
    session: Session,
) -> List[LinkedInJob]:
    """
    Bulk inserts a list of Job objects into the database.
    Checks for duplicates based on 'linkedin_job_id' and only inserts new records.
    """
    if not jobs:
        return []

        # 1. Extract all external IDs from the incoming list to query efficiently
    incoming_ids = {job.linkedin_job_id for job in jobs}

    # 2. Query the database to find full Job objects that already exist
    # We fetch the full object now so we can return them with their IDs
    statement = select(JobTable).where(JobTable.linkedin_job_id.in_(incoming_ids))
    existing_jobs = list(session.exec(statement).all())

    # Map existing IDs for quick lookup
    existing_ids = {job.linkedin_job_id for job in existing_jobs}

    # 3. Filter the incoming list: Keep only jobs whose IDs are NOT in the database
    # We also deduplicate the input list to prevent inserting the same job twice in one batch
    new_jobs = []
    seen_in_batch = set()

    for job in jobs:
        if job.linkedin_job_id not in existing_ids and job.linkedin_job_id not in seen_in_batch:
            new_jobs.append(job)
            seen_in_batch.add(job.linkedin_job_id)

    # 4. Bulk insert the new jobs
    if new_jobs:
        logger.info(f"Inserting {len(new_jobs)} new jobs...")
        session.add_all(new_jobs)
        session.commit()

        # 5. Refresh new jobs to ensure IDs and default values (like created_at) are populated from the DB
        for job in new_jobs:
            session.refresh(job)
    else:
        logger.info("No new jobs to insert.")

    # 6. Return the combined list of all jobs (existing + newly created)
    return existing_jobs + new_jobs

def insert_resume(
    user: UserProfile,
    resume: str,
    session: Session,
):
    """
    Inserts a resume into the user profile.
    :param user: user profile
    :param resume: the resume text
    :param session: the db session
    :return:
    """
    logger.info(f"Inserting resume into user profile: {user}")
    user.resume_text = resume
    session.add(user)
    session.commit()
    logger.info(f"Resume inserted into user profile: {user}")

def insert_user_instructions(
    user: UserProfile,
    user_instructions: str,
    session: Session,
):
    """
    Inserts user instructions into the user profile.
    :param user: user profile
    :param user_instructions: the user instructions text
    :param session: the db session
    :return:
    """
    logger.info(f"Inserting user instructions into user profile: {user}")
    user.filter_instructions = user_instructions
    session.add(user)
    session.commit()
    logger.info(f"User instructions inserted into user profile: {user}")
