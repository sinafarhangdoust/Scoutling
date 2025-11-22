import asyncio
import json
import random
import logging
from typing import List, Tuple
from urllib.parse import quote
import re
import html

import httpx
from pydantic import BaseModel, Field

from constants import (
    COUNTRY2GEOID,
    LOC2FPP,
    JOBS_EXTRACTION_PATTERN,
    DETAIL_LOCATION_PATTERN,
    DETAIL_DESCRIPTION_PATTERN,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

class Job(BaseModel):
    id: str
    title: str
    url: str
    description: str = None
    company: str = None
    location: str = None


async def ahttp_with_retry(
          client: httpx.AsyncClient,
          url: str,
          params: dict = None,
          headers: dict = None,
          retries: int = 3,
          random_wait: bool = True,
) -> str | None:
    """
    Makes an HTTP GET request with random delays, headers, and retry logic.
    """
    for attempt in range(retries):
        try:
            # Random Delay (Human-like behavior)
            # Sleep between 2 and 5 seconds to respect rate limits
            if random_wait:
                delay = random.uniform(2, 5)
                logger.info(f"Sleeping for {delay:.2f}s before requesting...")
                await asyncio.sleep(delay)

            logger.info(f"Fetching URL: {url} (Attempt {attempt + 1}/{retries})")
            response = await client.get(url, params=params, headers=headers, timeout=15.0)

            if response.status_code == 429:
                logger.warning("Rate limit hit (429). Cooling down for 10 seconds...")
                await asyncio.sleep(10)
                continue

            response.raise_for_status()

            return response.text

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e}")
            if e.response.status_code == 404:
                return None
        except httpx.RequestError as e:
            logger.error(f"Connection error: {e}")

    logger.error(f"Failed to fetch {url} after {retries} attempts.")
    return None


class LinkedinOps:

    def __init__(self, headers: dict = None):
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
                    description = LinkedinOps._clean_html(html.unescape(data['description']))
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
                description = LinkedinOps._clean_html(desc_match.group(1))

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
              start: int = 0,
              n_jobs: int = 10,
    ) -> List[Job]:
        """
        Specific wrapper for the Job Search API.
        """
        geo_id, ff_ps = self.map_loc2ids(location)
        params = {
            "keywords": quote(keywords),
            "location": location,
            "geoId": geo_id,
            "ff_p": quote(",".join([str(ff_p) for ff_p in ff_ps])),
            "start": start
        }
        jobs = []
        logger.info(f"Getting jobs {n_jobs} for location: {location} with keywords: {keywords}")
        while len(jobs) < n_jobs:
            response = await ahttp_with_retry(
                client=self.ahttp_client,
                url=self.base_search_url,
                params=params,
            )
            if response:
                jobs.extend(self.process_jobs(response))

            params["start"] += 10
        logger.info(f"Found {len(jobs)} jobs for location: {location} with keywords: {keywords}")

        jobs = jobs[:n_jobs]
        job_info_futures = [asyncio.create_task(self.get_job_info(job=job)) for job in jobs]

        return await asyncio.gather(*job_info_futures, return_exceptions=True)


async def main():
        keywords = "Machine Learning Engineer, AI Engineer"
        location = "Denmark"
        linkedin_ops = LinkedinOps()
        jobs = await linkedin_ops.get_jobs(
            keywords=keywords,
            location=location,
            n_jobs=10,
        )

if __name__ == "__main__":
    asyncio.run(main())


