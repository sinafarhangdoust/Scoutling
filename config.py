import os

try:
    OPENAI_API_KEY = os.environ['OPENAI_API_KEY']
except KeyError:
    raise KeyError('OPENAI_API_KEY not set!')

