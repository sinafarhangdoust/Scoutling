from typing import Optional, Literal, List
from datetime import datetime

from pydantic import BaseModel, Field

class JobSearchParamsInput(BaseModel):
    keywords: Optional[str] = Field(default=None, description="Job title or keywords, e.g., 'Python Developer'")
    location: Optional[str] = Field(default=None, description="Location to search, e.g., 'Denmark'")
    start: int = Field(default=0, description="The start of the search, useful for pagination.")
    limit: Optional[int] = Field(default=10, ge=1, le=50, description="Number of jobs to retrieve")
    time_filter: Optional[int] = Field(default=None, description="Time filter in seconds")
    sort_by: Literal['R', 'DD'] = Field(default='R', description="Sort by Relevance (R) or Recency (DD)")

class UserInstructionsInput(BaseModel):
    instructions: str = Field(..., description="The user instructions about the relevancy of the jobs")

class ResumeInput(BaseModel):
    resume: str = Field(..., description="User's resume")

class JobSearchCountriesInput(BaseModel):
    job_search_countries: List[str] = Field(..., description="Job search countries")

class JobSearchTitlesInput(BaseModel):
    job_search_titles: List[str] = Field(..., description="Job search titles")

class Job(BaseModel):
    id: Optional[int] = Field(default=None)
    linkedin_job_id: str
    title: str
    url: str
    description: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    posted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FilteredJob(Job):
    relevant: bool
    relevancy_reason: str
    applied: bool