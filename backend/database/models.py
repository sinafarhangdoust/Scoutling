from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Text, Column


# --- 1. The Job (Static Data) ---
class Job(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Using LinkedIn ID to prevent duplicates
    linkedin_job_id: str = Field(unique=True, index=True)
    title: str
    company: str
    location: str
    url: str
    description: str = Field(default="")
    posted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship to analysis
    analysis: Optional["JobAnalysis"] = Relationship(back_populates="job")


# --- 2. The User Context ---
class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="")
    email: str = Field(index=True)
    # Use sa_column=Column(Text) to ensure it can hold unlimited text
    resume_text: str = Field(default="", sa_column=Column(Text))

    # Instructions can also get long, so good to use Text here too
    filter_instructions: str = Field(default="", sa_column=Column(Text))

    updated_at: datetime = Field(default_factory=datetime.utcnow)


# --- 3. The AI Result ---
class JobAnalysis(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign Keys
    job_id: int = Field(foreign_key="job.id")
    user_id: int = Field(foreign_key="userprofile.id")

    # AI Output
    is_relevant: bool = Field(default=False)
    relevancy_reason: str = Field(default="")

    analyzed_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship back to job
    job: Optional[Job] = Relationship(back_populates="analysis")