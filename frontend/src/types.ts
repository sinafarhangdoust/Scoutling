export interface Job {
  linkedin_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string | null;
  relevant?: boolean;
  relevancy_reason?: string;
}
