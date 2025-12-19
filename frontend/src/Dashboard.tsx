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

  const LIMIT = 10; // Fixed limit per page

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
      setStart(offset); // Update state only after successful fetch
    } catch (error) {
      console.error("Error fetching jobs", error);
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for the Header search button (resets to page 0)
  const handleSearch = () => {
    fetchJobs(0);
  };

  // Pagination Helper
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
    <div className="flex flex-col h-full bg-[#FDFBF7] text-[#2D3748] overflow-hidden font-sans selection:bg-[#E6AA68] selection:text-white">

      <Header
        keywords={keywords} setKeywords={setKeywords}
        location={location} setLocation={setLocation}
        onSearch={handleSearch} loading={loading}
        showSearch={true}
      />

      <div className={`flex flex-1 overflow-hidden max-w-7xl w-full mx-auto p-6 transition-all duration-500 ease-in-out ${selectedJob ? 'gap-8' : 'gap-0'}`}>

        {/* LEFT COLUMN: Job List + Pagination */}
        <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${selectedJob ? 'w-5/12' : 'w-full max-w-4xl mx-auto'}`}>

          {/* List Status */}
          <div className="mb-4 px-2 flex justify-between items-center">
            <h2 className="text-xs font-black text-[#2D3748]/40 uppercase tracking-widest">
              {jobs.length > 0
                ? `Showing ${start + 1}-${start + jobs.length}`
                : 'Start Scouting'}
            </h2>
          </div>

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto pr-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#E6AA68]/50">
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-70">
                <div className="w-12 h-12 border-4 border-[#E6AA68] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-medium text-[#2D3748]/50">Scouting page {currentPage}...</p>
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 border-2 border-dashed border-[#2D3748]/10 rounded-2xl">
                <div className="text-6xl mb-4 grayscale opacity-50">🧭</div>
                <p className="text-lg font-bold text-[#2D3748]">Ready to Scout?</p>
                <p className="text-sm text-[#2D3748]/60 mt-2">Enter your dream job above.</p>
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

          {/* Pagination Controls (Fixed at Bottom) */}
          <div className="mt-4 pt-4 border-t-2 border-[#2D3748]/5 flex justify-center items-center gap-2">

            {/* Previous Arrow */}
            <button
              onClick={handlePrev}
              disabled={currentPage === 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#2D3748] hover:bg-[#E6AA68]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Page"
            >
              ←
            </button>

            {/* Page 1 (Always Visible) */}
            <button
              onClick={() => goToPage(1)}
              className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${
                currentPage === 1 
                  ? 'bg-[#E6AA68] text-white shadow-md scale-110' 
                  : 'text-[#2D3748] hover:bg-[#E6AA68]/10'
              }`}
            >
              1
            </button>

            {/* Ellipsis if we are far from page 1 */}
            {currentPage > 3 && <span className="text-[#2D3748]/40 font-bold">...</span>}

            {/* Previous Neighbor (e.g., show 4 if we are on 5) */}
            {currentPage > 2 && (
              <button
                onClick={() => goToPage(currentPage - 1)}
                className="w-8 h-8 rounded-lg font-bold text-sm text-[#2D3748] hover:bg-[#E6AA68]/10 transition-colors"
              >
                {currentPage - 1}
              </button>
            )}

            {/* Current Page (if not 1) */}
            {currentPage !== 1 && (
              <button
                disabled
                className="w-8 h-8 rounded-lg font-bold text-sm bg-[#E6AA68] text-white shadow-md scale-110"
              >
                {currentPage}
              </button>
            )}

            {/* Next Neighbor (show if we have a full page of results, implying more exist) */}
            {jobs.length === LIMIT && (
              <button
                onClick={() => goToPage(currentPage + 1)}
                className="w-8 h-8 rounded-lg font-bold text-sm text-[#2D3748] hover:bg-[#E6AA68]/10 transition-colors"
              >
                {currentPage + 1}
              </button>
            )}

            {/* Next Arrow */}
            <button
              onClick={handleNext}
              disabled={loading || (jobs.length < LIMIT && jobs.length > 0)}
              className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#2D3748] hover:bg-[#E6AA68]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Page"
            >
              →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        <div className={`bg-white rounded-[2rem] shadow-xl border-[#2D3748]/5 overflow-hidden flex flex-col relative transition-all duration-500 ease-in-out ${selectedJob ? 'w-7/12 border-2 opacity-100 translate-x-0' : 'w-0 border-0 opacity-0 translate-x-20'}`}>
          {selectedJob ? (
            <>
              <div className="h-3 bg-[#E6AA68] w-full"></div>

              <div className="p-8 overflow-y-auto h-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2D3748]/20">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex-1 pr-4">
                        <h2 className="text-3xl font-black text-[#2D3748] mb-3 leading-tight">{selectedJob.title}</h2>
                        <div className="flex flex-wrap gap-3 text-sm font-bold text-[#2D3748]/60">
                            <span className="flex items-center gap-1.5 bg-[#FDFBF7] px-3 py-1.5 rounded-lg border border-[#2D3748]/10">
                                🏢 {selectedJob.company}
                            </span>
                            <span className="flex items-center gap-1.5 bg-[#FDFBF7] px-3 py-1.5 rounded-lg border border-[#2D3748]/10">
                                📍 {selectedJob.location}
                            </span>
                        </div>
                    </div>

                    <a
                      href={selectedJob.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#2D3748] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#E6AA68] hover:shadow-lg transition-all transform hover:-translate-y-1 flex items-center gap-2 whitespace-nowrap group"
                    >
                      Apply Now <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                </div>

                <div className="w-full h-px bg-[#2D3748]/10 my-6"></div>

                <div className="prose max-w-none">
                   {detailsLoading ? (
                     <div className="space-y-6 py-10 animate-pulse opacity-50">
                        <div className="h-4 bg-[#2D3748]/10 rounded w-1/3"></div>
                        <div className="space-y-3">
                            <div className="h-3 bg-[#2D3748]/10 rounded w-full"></div>
                            <div className="h-3 bg-[#2D3748]/10 rounded w-full"></div>
                            <div className="h-3 bg-[#2D3748]/10 rounded w-5/6"></div>
                        </div>
                     </div>
                   ) : (
                     <div className="bg-[#FDFBF7] p-8 rounded-2xl border border-[#2D3748]/5">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[#2D3748]">
                            <span className="text-[#E6AA68]">📜</span> Job Details
                        </h3>
                        <p className="whitespace-pre-line leading-relaxed text-[#2D3748]/80 font-medium">
                            {selectedJob.description || "No description available."}
                        </p>
                     </div>
                   )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#2D3748]/30 bg-[#FDFBF7]/50">
               <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-6xl mb-6 shadow-sm border border-[#2D3748]/5">
                 👈
               </div>
               <p className="font-bold text-xl">Select a job to view details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
