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

  // Search state
  const [keywords, setKeywords] = useState('Python');
  const [location, setLocation] = useState('United States');
  const [limit, setLimit] = useState(10);

  // 1. Fetch the list of jobs
  const fetchJobs = async () => {
    setLoading(true);
    setSelectedJob(null);
    try {
      const response = await api.get('/jobs/list', {
        params: { keywords, location, limit }
      });
      setJobs(response.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle clicking a job (fetches details)
  const handleJobClick = async (job: Job) => {
    setSelectedJob(job);
    setDetailsLoading(true);

    try {
      const response = await api.get('/job/details', { params: job });
      setSelectedJob(response.data);

      // Update the job in the local list so we don't lose the description if we switch back
      setJobs(prevJobs =>
        prevJobs.map(j => j.id === job.id ? response.data : j)
      );

    } catch (error) {
      console.error("Error fetching details", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFBF7] text-[#2D3748] overflow-hidden font-sans selection:bg-[#E6AA68] selection:text-white">

      {/* --- HEADER COMPONENT --- */}
      <Header
        keywords={keywords} setKeywords={setKeywords}
        location={location} setLocation={setLocation}
        limit={limit} setLimit={setLimit}
        onSearch={fetchJobs} loading={loading}
      />

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex flex-1 overflow-hidden max-w-7xl w-full mx-auto p-6 gap-8">

        {/* LEFT COLUMN: Scrollable Job List */}
        <div className="w-5/12 flex flex-col">

          {/* List Status/Header */}
          <div className="mb-4 px-2 flex justify-between items-center">
            <h2 className="text-xs font-black text-[#2D3748]/40 uppercase tracking-widest">
              {jobs.length > 0 ? `${jobs.length} Opportunities Found` : 'Start Scouting'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-3 pb-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#E6AA68]/50">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-70">
                <div className="w-12 h-12 border-4 border-[#E6AA68] border-t-transparent rounded-full animate-spin"></div>
                <p className="font-medium text-[#2D3748]/50">Scouting the horizon...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && jobs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50 border-2 border-dashed border-[#2D3748]/10 rounded-2xl">
                <div className="text-6xl mb-4 grayscale opacity-50">🧭</div>
                <p className="text-lg font-bold text-[#2D3748]">Ready to Scout?</p>
                <p className="text-sm text-[#2D3748]/60 mt-2">Enter your dream job and location above.</p>
              </div>
            )}

            {/* Job Cards */}
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => handleJobClick(job)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Details Panel */}
        <div className="w-7/12 bg-white rounded-[2rem] shadow-xl border-2 border-[#2D3748]/5 overflow-hidden flex flex-col relative">
          {selectedJob ? (
            <>
              {/* Decorative Top Bar */}
              <div className="h-3 bg-[#E6AA68] w-full"></div>

              <div className="p-8 overflow-y-auto h-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2D3748]/20">

                {/* Details Header */}
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

                {/* Details Content */}
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
            // Empty State for Right Panel
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