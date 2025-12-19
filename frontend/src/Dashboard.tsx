import { useState } from 'react';
import api from './api';
import type { Job } from './types';
import Header from './components/Header';
import JobCard from './components/JobCard';

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Search & Pagination state
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState(0);

  const LIMIT = 10;

  // Calculated values for pagination
  const currentPage = Math.floor(start / LIMIT) + 1;

  // Fetch jobs with a specific start offset
  const fetchJobs = async (offset: number = 0) => {
    setLoading(true);
    setSelectedJob(null);

    try {
      const response = await api.get('/jobs/list', {
        params: {
          keywords,
          location,
          start: offset,
          limit: LIMIT
        }
      });
      setJobs(response.data);
      setStart(offset);
    } catch (error) {
      console.error("Error fetching jobs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchJobs(0);
  };

  const goToPage = (page: number) => {
    const newStart = (page - 1) * LIMIT;
    fetchJobs(newStart);
  };

  const handleNext = () => {
    goToPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleJobClick = async (job: Job) => {
    setSelectedJob(job);
    setDetailsLoading(true);

    try {
      const response = await api.get('/job/details', { params: job });
      setSelectedJob(response.data);
      setJobs(prevJobs =>
        prevJobs.map(j => j.linkedin_job_id === job.linkedin_job_id ? response.data : j)
      );
    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-50 font-sans transition-colors duration-300">

      <Header
        keywords={keywords} setKeywords={setKeywords}
        location={location} setLocation={setLocation}
        onSearch={handleSearch} loading={loading}
        showSearch={true}
      />

      <div className={`flex flex-1 overflow-hidden max-w-7xl w-full mx-auto p-6 transition-all duration-300 ease-in-out ${selectedJob ? 'gap-6' : 'gap-0'}`}>

        {/* LEFT COLUMN: Job List + Pagination */}
        <div className={`flex flex-col h-full transition-all duration-300 ease-in-out ${selectedJob ? 'w-5/12' : 'w-full max-w-3xl mx-auto'}`}>

          {/* List Status */}
          <div className="mb-3 flex justify-between items-center">
             <h2 className="text-sm font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-wide">
              {jobs.length > 0
                ? `Showing ${start + 1}-${start + jobs.length} Jobs`
                : 'Scout Jobs'}
            </h2>
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brand-300 dark:scrollbar-thumb-brand-700 scrollbar-track-transparent">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-brand-500 dark:text-brand-400">Retrieving listings...</p>
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-brand-200 dark:border-brand-700 rounded-lg bg-brand-100/50 dark:bg-brand-900/50">
                <svg className="w-12 h-12 text-brand-300 dark:text-brand-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <p className="font-semibold text-brand-700 dark:text-brand-300">No jobs found</p>
                <p className="text-sm text-brand-500 dark:text-brand-400 mt-1">Try refining your search terms.</p>
              </div>
            )}

            {jobs.map((job) => (
              <JobCard
                key={job.linkedin_job_id}
                job={job}
                isSelected={selectedJob?.linkedin_job_id === job.linkedin_job_id}
                onClick={() => handleJobClick(job)}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-800 flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-600 dark:text-brand-300 hover:bg-white dark:hover:bg-brand-800 hover:shadow-sm border border-transparent hover:border-brand-200 dark:hover:border-brand-700 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              Previous
            </button>

            <span className="text-xs font-medium text-brand-400">Page {currentPage}</span>

            <button
              onClick={handleNext}
              disabled={loading || (jobs.length < LIMIT && jobs.length > 0)}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-600 dark:text-brand-300 hover:bg-white dark:hover:bg-brand-800 hover:shadow-sm border border-transparent hover:border-brand-200 dark:hover:border-brand-700 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              Next
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        <div className={`bg-white dark:bg-brand-900 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 overflow-hidden flex flex-col relative transition-all duration-300 ease-in-out ${selectedJob ? 'w-7/12 opacity-100 translate-x-0' : 'w-0 border-0 opacity-0 translate-x-10'}`}>
          {selectedJob ? (
            <div className="flex flex-col h-full">
              {/* Toolbar / Header */}
              <div className="px-8 py-6 border-b border-brand-100 dark:border-brand-800 flex justify-between items-start gap-4">
                 <div>
                    <h1 className="text-2xl font-bold text-brand-900 dark:text-white leading-tight mb-2">{selectedJob.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-brand-500 dark:text-brand-400">
                        <span className="flex items-center gap-1.5 font-medium text-brand-700 dark:text-brand-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {selectedJob.company}
                        </span>
                        <span className="flex items-center gap-1.5">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {selectedJob.location}
                        </span>
                    </div>
                 </div>

                 <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md font-semibold text-sm shadow-sm transition-colors"
                  >
                      Apply Now
                 </a>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-brand-200 dark:scrollbar-thumb-brand-700">
                   {detailsLoading ? (
                     <div className="space-y-4 py-4 animate-pulse">
                        <div className="h-4 bg-brand-100 dark:bg-brand-800 rounded w-1/3"></div>
                        <div className="space-y-2">
                            <div className="h-3 bg-brand-100 dark:bg-brand-800 rounded w-full"></div>
                            <div className="h-3 bg-brand-100 dark:bg-brand-800 rounded w-full"></div>
                            <div className="h-3 bg-brand-100 dark:bg-brand-800 rounded w-5/6"></div>
                        </div>
                     </div>
                   ) : (
                     <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-brand-600 dark:text-brand-300">
                        <h3 className="text-lg font-semibold text-brand-800 dark:text-brand-200 mb-4">Job Description</h3>
                        <p className="whitespace-pre-line leading-relaxed">
                            {selectedJob.description || "No description provided."}
                        </p>
                     </div>
                   )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-brand-400 bg-brand-50/50 dark:bg-brand-900/50">
               <p className="font-medium">Select a job to view details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}