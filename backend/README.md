# Backend setup

## steps to take

1. Run the docker compose:

    ```
    docker-compose -f up -d
    ```

2. Run the job_apis.py
3. celery -A backend.queue.worker.celery_app worker --loglevel=info