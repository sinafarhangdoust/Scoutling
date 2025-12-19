import os
from pathlib import Path
import logging

from dotenv import dotenv_values

dev_env_path = env_path = (Path(__file__).resolve().parent / ".." / ".env.development").resolve()
config = dotenv_values(dotenv_path=dev_env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

try:
    os.environ['OPENAI_API_KEY'] = config['OPENAI_API_KEY']
except KeyError:
    raise KeyError('OPENAI_API_KEY not set!')

