from typing import Optional, Literal

from pydantic import BaseModel, Field

class JobSearchParamsInput(BaseModel):
    keywords: str = Field(..., description="Job title or keywords, e.g., 'Python Developer'")
    location: str = Field(..., description="Location to search, e.g., 'Denmark'")
    limit: int = Field(10, ge=1, le=50, description="Number of jobs to retrieve")
    time_filter: Optional[int] = Field(None, description="Time filter in seconds")
    sort_by: Literal['R', 'DD'] = Field('R', description="Sort by Relevance (R) or Recency (DD)")