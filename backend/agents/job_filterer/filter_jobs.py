import asyncio
import json
from typing import List, Tuple

from backend.linkedin.linkedin_wrapper import Job
from backend.agents.job_filterer.agent import instantiate_job_filterer, build_batch_inputs, JobFiltererOutput
from backend.config import logger


async def filter_jobs(
          jobs: List[Job],
          user_instructions: str,
          resume: str,
) -> Tuple[List[Job], List[str]]:


    filterer = instantiate_job_filterer()
    batch_inputs = build_batch_inputs(
        jobs=jobs,
        user_instructions=user_instructions,
        resume=resume
    )
    outputs: List[JobFiltererOutput] = await filterer.abatch(batch_inputs)

    filtered_jobs = []
    relevancy_reasons = []
    for output, job in zip(outputs, jobs):

        if not isinstance(output, JobFiltererOutput):
            logger.warning("The job filterer output is not an instance of JobFiltererOutput")
            continue

        if output.decision == 'KEEP':
            filtered_jobs.append(job)
            relevancy_reasons.append(output.relevancy_reason)

    return filtered_jobs, relevancy_reasons

async def main():
    # mock jobs
    with open('../../jobs.json') as f:
        jobs = json.load(f)

    # mock resume
    with open('../../resume.md') as f:
        resume = f.read()

    jobs = [Job(**job) for job in jobs]
    user_instructions = """I'm looking for Machine Learning Engineer, AI Engineer, Data scientist or positions very similar to these"""

    # mocking shortlisted jobs
    logger.info(f"Starting to short list {len(jobs)} jobs")
    shortlisted_jobs = jobs[:5]
    logger.info(f"Finished short listing jobs. {len(shortlisted_jobs)} jobs got shortlisted")

    filtered_jobs = await filter_jobs(shortlisted_jobs, user_instructions, resume)


if __name__ == '__main__':
    asyncio.run(main())