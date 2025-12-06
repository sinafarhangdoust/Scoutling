# Backend setup

## steps to take

1. Run the docker compose:

    ```
    docker-compose -f up -d
    ```

2. Run the job_apis.py
3. Run celery message broker:

   ```
   `celery -A backend.queue.worker.celery_app worker --loglevel=info`
   ```

If needed to purge the queue, run:

   ```
   celery -A backend.queue.worker.celery_app purge
   ```