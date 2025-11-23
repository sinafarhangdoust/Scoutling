import os
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    OPENAI_API_KEY = os.environ['OPENAI_API_KEY']
except KeyError:
    raise KeyError('OPENAI_API_KEY not set!')

