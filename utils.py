import asyncio
import random
import logging
from typing import Callable

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

async def async_with_concurrency(
          func: Callable,
          semaphore: asyncio.Semaphore,
          **kwargs
):
    """
    Execute an asynchronous function while respecting a concurrency limit.

    :param func: An awaitable function to be executed.
    :param semaphore: The semaphore controlling how many tasks may run at once.
    :param kwargs: Arbitrary keyword arguments passed directly to `func`
    :return:
    """
    async with semaphore:
        return await func(**kwargs)