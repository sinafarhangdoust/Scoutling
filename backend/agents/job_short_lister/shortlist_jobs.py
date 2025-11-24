import json
import asyncio
from typing import List

from agents.job_short_lister.agent import instantiate_job_short_lister, build_batch_inputs, JobShortListerOutput
from linkedin.linkedin_wrapper import Job
from config import logger

async def shortlist_jobs(
          jobs: List[Job],
          user_instructions: str,
) -> List[Job]:


    short_lister = instantiate_job_short_lister()
    batch_inputs = build_batch_inputs(
        jobs=jobs,
        user_instructions=user_instructions,
    )
    outputs = await short_lister.abatch(batch_inputs)

    short_listed_jobs = []
    for output, job in zip(outputs, jobs):

        if not isinstance(output, JobShortListerOutput):
            logger.warning("The job short lister output is not an instance of JobShortListerOutput")
            continue

        if output.decision == 'DISCARD':
            continue

        short_listed_jobs.append(job)

    return short_listed_jobs

async def main():
    with open('../../jobs.json') as f:
        jobs = json.load(f)

    jobs = [Job(**job) for job in jobs]
    user_instructions = """I'm looking for Machine Learning Engineer, AI Engineer, Data scientist or positions very similar to these"""

    logger.info(f"Starting to short list {len(jobs)} jobs")
    shortlisted_jobs = await shortlist_jobs(jobs[:2], user_instructions)
    logger.info(f"Finished short listing jobs. {len(shortlisted_jobs)} jobs got shortlisted")

if __name__ == '__main__':
    asyncio.run(main())
