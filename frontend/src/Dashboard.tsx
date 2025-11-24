import { useState } from 'react';
import api from './api';
import type { Job } from './types';

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [keywords, setKeywords] = useState('Python');
  const [location, setLocation] = useState('United States');
  const [limit, setLimit] = useState(10); // Added limit control

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // We pass the params directly. FastAPI will map these to JobSearchParamsInput
      const response = await api.get('/jobs/list', {
        params: {
          keywords: keywords,
          location: location,
          limit: limit
        }
      });
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
      alert("Error fetching jobs. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">LinkedIn Job Scraper</h1>

      {/* Search Bar */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Python Developer"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. United States"
          />
        </div>

        <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>

        <div className="flex items-end">
            <button
            onClick={fetchJobs}
            disabled={loading}
            className="h-10 px-8 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
            {loading ? 'Scanning...' : 'Search'}
            </button>
        </div>
      </div>

      {/* Results Grid */}
      {jobs.length === 0 && !loading && (
          <p className="text-gray-500 text-center mt-10">No jobs found yet. Try searching.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <div key={job.id} className="flex flex-col rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{job.title}</h3>
            <p className="text-sm font-semibold text-blue-600 mb-2">{job.company || "Unknown Company"}</p>
            <div className="flex items-center text-sm text-gray-500 mb-4">
               <span>📍 {job.location || "Remote"}</span>
            </div>

            <div className="mt-auto pt-4 border-t">
                <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center rounded bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                Apply on LinkedIn ↗
                </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}