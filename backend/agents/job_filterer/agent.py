import yaml
from pathlib import Path
from typing import Literal, List, Dict

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from backend.utils import llm_factory
from backend.linkedin.linkedin_wrapper import Job

MODULE_DIR = Path(__file__).resolve().parent

class JobFiltererOutput(BaseModel):
    decision: Literal['KEEP', 'DISCARD'] = Field(
        description="The decision to either 'KEEP' or 'DISCARD' the job."
    )

# TODO: read the config from cloud
def load_config(path: str = None) -> dict:
    if not path:
        path = MODULE_DIR / 'config.yml'
    with open(path, "r") as f:
        return yaml.safe_load(f)

# TODO: read the prompts from cloud
def load_system_prompt(path: str = None) -> str:
    if not path:
        path = MODULE_DIR / 'system_prompt.md'
    with open(path, "r") as f:
        return f.read()

def load_user_prompt(path: str = None) -> str:
    if not path:
        path = MODULE_DIR / 'user_prompt.txt'
    with open(path, "r") as f:
        return f.read()

def build_batch_inputs(
    jobs: List[Job],
    user_instructions: str,
    resume: str,
) -> List[Dict]:
    batch_inputs = []
    for job in jobs:
        batch_inputs.append(
            {
                'job_title': str(job.title),
                'job_description': str(job.description),
                'job_id': job.id,
                'user_instructions': user_instructions,
                'resume': resume
            }
        )

    return batch_inputs

# TODO: handle input size
def instantiate_job_filterer():

    agent_config = load_config()
    llm = llm_factory(**agent_config.get('llm'))

    if not agent_config.get('streaming'):
        llm.disable_streaming = True

    sys_prompt = load_system_prompt()
    user_prompt = load_user_prompt()
    prompt_template = ChatPromptTemplate.from_messages([
        ('system', sys_prompt),
        ('human', user_prompt)
    ])

    if agent_config.get("output") == "Structured":
        structured_llm = llm.with_structured_output(JobFiltererOutput)
        return prompt_template | structured_llm

    return prompt_template | llm