import asyncio
import json

from typing import List, Tuple, Literal
import re
import html

import httpx
from pydantic import BaseModel

from constants import (
    COUNTRY2GEOID,
    LOC2FPP,
    JOBS_EXTRACTION_PATTERN,
    DETAIL_LOCATION_PATTERN,
    DETAIL_DESCRIPTION_PATTERN,
)
from utils import (
    ahttp_with_retry,
    async_with_concurrency,
    SingletonMeta
)
from config import logger

class Job(BaseModel):
    id: str
    title: str
    url: str
    description: str = None
    company: str = None
    location: str = None


class LinkedinWrapper(metaclass=SingletonMeta):

    def __init__(self, headers: dict = None):
        if not hasattr(self, 'initialized'):
            self.ahttp_client = httpx.AsyncClient()
            self.base_search_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
            if headers:
                self.headers = headers
            else:
                self.headers = {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                }
            self.initialized = True

    async def close_connection(self):
        logger.info("Closing httpx client...")
        await self.ahttp_client.aclose()


    @staticmethod
    def map_loc2ids(location: str) -> Tuple[int, List[int]]:
        """
        returns geoid and fine locations of a given location
        :param location: the location to look for
        :return:
        """
        logger.info(f"Mapping {location} to ids")
        return COUNTRY2GEOID[location], LOC2FPP[location]

    @staticmethod
    def _clean_html(raw_html: str) -> str:
        """
        Helper to remove HTML tags and clean up entities for the description.
        """
        # Replace line breaks with newlines
        text = re.sub(r'<br\s*/?>', '\n', raw_html)
        text = re.sub(r'</?p>', '\n', text)
        text = re.sub(r'</li>', '\n', text)  # End of list item = newline

        # Remove all remaining HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Decode common HTML entities
        text = text.replace('&amp;', '&').replace('&nbsp;', ' ').replace('&gt;', '>').replace('&lt;', '<')

        # Collapse multiple newlines into max two
        text = re.sub(r'\n\s*\n', '\n\n', text)

        return text.strip()

    @staticmethod
    def process_jobs(response: str) -> List[Job]:
        """
        processes the response of the get_jobs function and returns a list of Jobs
        :param response: the raw html response
        :return:
        """
        results = []
        matches = re.finditer(JOBS_EXTRACTION_PATTERN, response)

        for match in matches:
            job_id = match.group(1)
            raw_url = match.group(2)
            raw_title = match.group(3)
            raw_company = match.group(4)

            # Clean the extracted data
            clean_url = raw_url.split('?')[0]
            clean_title = raw_title.strip()
            clean_company = raw_company.strip()

            results.append(
                Job(
                    id=job_id,
                    title=clean_title,
                    company=clean_company,
                    url=clean_url,
                )
            )

        return results

    @staticmethod
    def process_job_info(response: str) -> Tuple[str | None, str | None]:
        """
        Parses the detailed Job page.
        Priority 1: JSON-LD (Structured Data)
        Priority 2: HTML Regex (Fallback)
        """
        location = None
        description = None

        # --- STRATEGY 1: JSON-LD (Most Reliable) ---
        json_match = re.search(r'<script type="application/ld\+json">\s*({.*?})\s*</script>', response, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))

                if 'jobLocation' in data and 'address' in data['jobLocation']:
                    addr = data['jobLocation']['address']

                    parts = [
                        addr.get('addressLocality'),
                        addr.get('addressRegion'),
                        addr.get('addressCountry')
                    ]
                    location = ", ".join([p for p in parts if p])

                if 'description' in data:
                    description = LinkedinWrapper._clean_html(html.unescape(data['description']))
            except:
                pass  # Fallback to regex if JSON fails

        # --- STRATEGY 2: Regex Fallback ---
        # Only run if we didn't find data in JSON-LD
        if not location:
            # re.DOTALL ensures '.' matches newlines
            loc_match = re.search(DETAIL_LOCATION_PATTERN, response, re.DOTALL)
            if loc_match:
                location = loc_match.group(1).strip()

        if not description:
            desc_match = re.search(DETAIL_DESCRIPTION_PATTERN, response, re.DOTALL)
            if desc_match:
                description = LinkedinWrapper._clean_html(desc_match.group(1))

        return location, description

    async def get_job_info(self, job: Job):
        response = await ahttp_with_retry(
            client=self.ahttp_client,
            headers=self.headers,
            url=job.url,
        )
        if response:
            job.location, job.description = self.process_job_info(response)

        return job

    async def get_jobs(
              self,
              keywords: str,
              location: str,
              time_filter: int = None,
              start: int = 0,
              n_jobs: int = 10,
              sort_by: Literal['R', 'DD'] = 'R',
    ) -> List[Job]:
        """
        Specific wrapper for the Job Search API.

        :param keywords: keywords to search for
        :param location: location to look for
        :param time_filter: time filter to use in seconds
        :param start: start index
        :param n_jobs: number of jobs to retrieve
        :param sort_by: sort by relevance or most recent
        """
        geo_id, f_pps = self.map_loc2ids(location)
        params = {
            "f_PP": ",".join([str(f_pp) for f_pp in f_pps]),
            "geoId": geo_id,
            "keywords": keywords,
            "start": start,
            "sortBy": sort_by,
        }
        if time_filter:
            params["f_TPR"] = f"r{str(time_filter)}"
        jobs = []
        logger.info(f"Getting jobs {n_jobs} for location: {location} with keywords: {keywords}")
        while len(jobs) < n_jobs:
            response = await ahttp_with_retry(
                client=self.ahttp_client,
                url=self.base_search_url,
                params=params,
                random_wait=False
            )
            if response:
                processed_response = self.process_jobs(response)
                if len(processed_response) == 0:
                    break
                jobs.extend(processed_response)

            params["start"] += 10
        logger.info(f"Found {len(jobs)} jobs for location: {location} with keywords: {keywords}")

        jobs = jobs[:n_jobs]

        return jobs

    async def get_jobs_details(
            self,
            keywords: str,
            location: str,
            time_filter: int = None,
            start: int = 0,
            n_jobs: int = 10,
            sort_by: Literal['R', 'DD'] = 'R',
            concurrency_limit: int = 3,
    ) -> List[Job]:
        """
        Specific wrapper for the Job Search API.

        :param keywords: keywords to search for
        :param location: location to look for
        :param time_filter: time filter to use in seconds
        :param start: start index
        :param n_jobs: number of jobs to retrieve
        :param sort_by: sort by relevance or most recent
        :param concurrency_limit: the number of concurrency
        """
        jobs = await self.get_jobs(
            keywords=keywords,
            location=location,
            time_filter=time_filter,
            start=start,
            n_jobs=n_jobs,
            sort_by=sort_by,
        )

        semaphore = asyncio.Semaphore(concurrency_limit)

        job_info_futures = [
            asyncio.create_task(async_with_concurrency(
                func=self.get_job_info,
                semaphore=semaphore,
                job=job
            )) for job in jobs
        ]

        # TODO: handle errors
        return await asyncio.gather(*job_info_futures, return_exceptions=True)


# Usage example
async def main():
        keywords = "Machine Learning Engineer"
        location = "Denmark"
        linkedin_wrapper = LinkedinWrapper()
        jobs = await linkedin_wrapper.get_jobs(
            keywords=keywords,
            location=location,
            n_jobs=50,
        )

if __name__ == "__main__":
    asyncio.run(main())


