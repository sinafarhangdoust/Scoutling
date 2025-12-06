from sqlmodel import SQLModel, create_engine, Session, select, text, delete

from backend.database.models import Job, JobAnalysis, UserProfile
from backend.config import logger
from backend.constants import DATABASE_ENDPOINT

engine = create_engine(DATABASE_ENDPOINT, echo=False)

users = [
    UserProfile(
        name="single_user",
        email="scoutling@scoutling.com",
        filter_instructions="Looking for machine learning engineer, AI Engineer and data science roles. No student or internship roles."
    )
]

def get_session():
    """Dependency db session"""
    return Session(engine)

def init_db(override: bool = False):
    """Creates the tables if they don't exist and populates default users."""
    if override:
        logger.info("Removing all the data and overriding the default")
        clear_all_data(reset_ids=False)

    # create tables
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:

        for test_user in users:
            existing_user = session.exec(
                select(UserProfile).where(UserProfile.email == test_user.email)
            ).first()
            existing_user: UserProfile
            if existing_user and override:
                existing_user.name = test_user.name
                existing_user.resume_text = test_user.resume_text
                existing_user.filter_instructions = test_user.filter_instructions
                session.add(existing_user)
            else:
                session.add(test_user)

        session.commit()
        logger.info("Database initialization complete.")


def clear_all_data(reset_ids: bool = True):
    """
    Deletes all records from the database.

    :param reset_ids: If True, uses TRUNCATE to reset primary key counters (CASCADE).
                      If False, uses DELETE FROM (safer, keeps IDs incrementing).
    """
    with Session(engine) as session:
        if reset_ids:
            # Method 1: TRUNCATE (Fast, Resets IDs, requires raw SQL)
            # 'CASCADE' ensures linked data (like JobAnalysis) is also cleared
            logger.info("Truncating tables (resetting IDs)...")
            session.exec(text("TRUNCATE TABLE userprofile, job, jobanalysis RESTART IDENTITY CASCADE"))
        else:
            SQLModel.metadata.drop_all(engine)

        session.commit()
        logger.info("All records have been cleared.")


if __name__ == '__main__':
    # You can change override to True if you want to force update the test data
    init_db(override=True)
