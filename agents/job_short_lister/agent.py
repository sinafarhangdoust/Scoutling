import yaml
from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate

from utils import llm_factory


# TODO: read the config from cloud
def load_config(path: str | Path = "config.yml") -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)

# TODO: read the prompts from cloud
def load_system_prompt(path: str | Path = "system_prompt.md") -> str:
    with open(path, "r") as f:
        return f.read()

def load_user_prompt(path: str | Path = "user_prompt.txt") -> str:
    with open(path, "r") as f:
        return f.read()

# TODO: handle input size
def instantiate_job_short_lister():

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

    return llm | prompt_template