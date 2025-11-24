export interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string | null;
}