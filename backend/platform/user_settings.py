import os
from backend.constants import USER_BASE_PATH

def save_file(path: str, content: str):
    with open(path, "w") as f:
        f.write(content)

def load_file(path: str):
    with open(path, "r") as f:
        return f.read()

def save_instructions(instructions: str) -> None:
    """
    saves the user instructions
    :param instructions: the user instructions to save
    :return:
    """
    if not os.path.exists(USER_BASE_PATH):
        os.makedirs(USER_BASE_PATH)

    instructions_path = os.path.join(USER_BASE_PATH, "instructions.txt")
    save_file(path=instructions_path, content=instructions)

def save_resume(resume: str) -> None:
    """
    saves the user's resume
    :param resume: user's resume to save
    :return:
    """
    if not os.path.exists(USER_BASE_PATH):
        os.makedirs(USER_BASE_PATH)

    resume_path = os.path.join(USER_BASE_PATH, "resume.txt")
    save_file(path=resume_path, content=resume)

def load_instructions(path: str = 'instructions.txt'):
    """
    loads the user's instructions
    :param path: the path to load the instructions from
    :return:
    """
    instructions_path = os.path.join(USER_BASE_PATH, path)
    return load_file(path=instructions_path)


def load_resume(path: str = 'resume.txt'):
    """
    loads the user's resume
    :param path: the path to load the resume from
    :return:
    """
    resume_path = os.path.join(USER_BASE_PATH, path)
    return load_file(path=resume_path)