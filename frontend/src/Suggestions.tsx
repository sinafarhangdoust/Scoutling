import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JobCard from './components/JobCard';
import type { Job } from './types';
import api from './api';

// Helper interface matching your Backend's FilteredJob schema
interface FilteredJobResponse {
  id: number; // Database ID
  linkedin_job_id: string; // The string ID we use in the frontend
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string | null;
  relevant: boolean;
  relevancy_reason: string;
  applied: boolean;
}

interface AnalysisStatus {
  status: 'idle' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  task_id?: string | null;
  celery_state?: string | null;
  started_at?: string | null;
}

export default function Suggestions() {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayDismissedRef = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({ status: 'idle' });
  const [relevantJobs, setRelevantJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filters State
  // Removed filterRelevant state
  const [filterApplied, setFilterApplied] = useState<string>('all');
  const [filterLimit, setFilterLimit] = useState<number>(10);
  const [start, setStart] = useState(0);

  // Validation Modal State
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [showAppliedPrompt, setShowAppliedPrompt] = useState(false);

  // Calculated values for pagination
  const currentPage = Math.floor(start / filterLimit) + 1;

  // Load existing suggestions and status on mount
  useEffect(() => {
    fetchSuggestions(0);
    
    // Initial status check
    api.get<AnalysisStatus>('/jobs/filter/status').then(response => {
        setAnalysisStatus(response.data);
        if (response.data.status === 'IN_PROGRESS') {
            startPolling();
        }
    }).catch(err => console.error(err));
  }, []); // Initial load only for status

  // Refetch when filters change (reset to page 1)
  useEffect(() => {
      fetchSuggestions(0);
  }, [filterApplied, filterLimit]);

  // Reset prompt when job changes
  useEffect(() => {
    setShowAppliedPrompt(false);
  }, [selectedJob?.linkedin_job_id]);

  const fetchSuggestions = async (offset: number = 0) => {
    try {
      const params: any = { limit: filterLimit, offset: offset };
      
      // Removed logic for filterRelevant
      
      if (filterApplied === 'applied') params.applied = true;
      else if (filterApplied === 'not_applied') params.applied = false;

      // Call the GET endpoint you defined
      const response = await api.get<FilteredJobResponse[]>('/jobs/filter', { params });

      // Map backend response to frontend Job type
      // We use 'linkedin_job_id' as 'id' to keep consistency with the Dashboard
      const mappedJobs: Job[] = response.data.map(item => ({
        linkedin_job_id: item.linkedin_job_id,
        title: item.title,
        company: item.company,
        location: item.location,
        url: item.url,
        description: item.description,
        relevant: item.relevant,
        relevancy_reason: item.relevancy_reason,
        applied: item.applied
      }));

      setRelevantJobs(mappedJobs);
      setStart(offset);
    } catch (error) {
      console.error("Failed to load suggestions", error);
    }
  };

  // Pagination Helper
  const goToPage = (page: number) => {
    const newStart = (page - 1) * filterLimit;
    fetchSuggestions(newStart);
  };

  const handleNext = () => {
    goToPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleApplyClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.open(url, '_blank');
    if (!selectedJob?.applied) {
        setShowAppliedPrompt(true);
    }
  };

  const confirmApplied = async (applied: boolean) => {
    setShowAppliedPrompt(false);
    if (!selectedJob || !applied) return;

    try {
        await api.post('/job/applied', {
            linkedin_job_id: selectedJob.linkedin_job_id,
            applied: true
        });

        // Update local state
        const updatedJob = { ...selectedJob, applied: true };
        setSelectedJob(updatedJob);
        setRelevantJobs(prev => prev.map(j => j.linkedin_job_id === updatedJob.linkedin_job_id ? updatedJob : j));

    } catch (error) {
        console.error("Failed to update applied status", error);
    }
  };

  const checkStatus = async (): Promise<AnalysisStatus | null> => {
    try {
      const response = await api.get<AnalysisStatus>('/jobs/filter/status');
      setAnalysisStatus(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to load analysis status", error);
      return null;
    }
  };

  const startPolling = () => {
      setAnalyzing(true);
      
      // If we are starting polling and didn't dismiss overlay, show it
      if (!overlayDismissedRef.current) {
          setShowOverlay(true);
      }

      let attempts = 0;
      const maxAttempts = 200; // ~10 minutes max polling

      const interval = setInterval(async () => {
          attempts++;
          try {
              const status = await checkStatus();
              const isRunning = status?.status === 'IN_PROGRESS';

              if (!isRunning || attempts >= maxAttempts) {
                  clearInterval(interval);
                  setAnalyzing(false);

                  // If completed (or failed), refresh the list
                  await fetchSuggestions(0);

                  // Handle overlay logic
                  overlayDismissedRef.current = false;

                  if (status?.status === 'FAILED' || attempts >= maxAttempts) {
                      setShowOverlay(false);
                  } else {
                      // Success case: allow overlay to show "Analysis Complete" for a moment
                      setTimeout(() => setShowOverlay(false), 2000);
                  }
              }
          } catch (err) {
              console.error("Polling error", err);
          }
      }, 3000);
  };

  const runAIFilter = async () => {
    // 1. Validation: Ensure user settings are complete
    try {
        const [resumeRes, countriesRes, titlesRes] = await Promise.all([
            api.get<string>('/user/resume'),
            api.get<string[]>('/user/job_search_countries'),
            api.get<string[]>('/user/job_search_titles')
        ]);

        const resume = resumeRes.data;
        const countries = countriesRes.data;
        const titles = titlesRes.data;

        const missing = [];
        if (!resume || resume.trim().length < 10) missing.push("Resume");
        if (!countries || countries.length === 0) missing.push("Target Countries");
        if (!titles || titles.length === 0) missing.push("Job Titles");

        if (missing.length > 0) {
            setMissingItems(missing);
            setShowValidationModal(true);
            return;
        }
    } catch (error) {
        console.error("Failed to validate settings", error);
        alert("Could not verify your settings. Please try again.");
        return;
    }

    // Reset overlay flag so it shows up for new run
    overlayDismissedRef.current = false;
    setShowOverlay(true); 
    setAnalyzing(true);

    try {
        await api.post('/jobs/filter');
        startPolling();
    } catch (error: unknown) {
        const apiError = error as { response?: { status: number } };
        if (apiError.response?.status === 409) {
            // Already running, just attach poller
            startPolling();
        } else {
            console.error("AI Analysis failed", error);
            alert("Failed to trigger analysis. Ensure Backend & Worker are running.");
            setAnalyzing(false);
            setShowOverlay(false);
        }
    }
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* --- VALIDATION MODAL --- */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[60] bg-[#2D3748]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border-2 border-[#E6AA68]/20 p-8 transform transition-all scale-100">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#FFF4E6] rounded-full flex items-center justify-center mb-6 text-3xl">
                        ⚙️
                    </div>
                    <h3 className="text-2xl font-black text-[#2D3748] mb-2">Profile Incomplete</h3>
                    <p className="text-[#2D3748]/60 mb-6 leading-relaxed">
                        To find the best matches, the AI agent needs a bit more info from you.
                    </p>
                    
                    <div className="w-full bg-[#FDFBF7] border border-[#2D3748]/10 rounded-xl p-4 mb-4 text-left">
                        <p className="text-xs font-bold text-[#2D3748]/40 uppercase tracking-wider mb-3">Missing Items</p>
                        <ul className="space-y-2">
                            {missingItems.map((item, idx) => (
                                <li key={idx} className="flex items-center gap-3 text-[#2D3748] font-bold">
                                    <span className="text-red-500 text-lg">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl text-left mb-6 w-full">
                        <span className="text-xl">💡</span>
                        <p className="text-xs font-medium text-blue-800 leading-relaxed">
                            <span className="font-bold">Pro Tip:</span> While optional, adding specific <strong>Agent Instructions</strong> is highly recommended for the best results.
                        </p>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setShowValidationModal(false)}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-[#2D3748] hover:bg-[#F3F4F6] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-[#2D3748] text-white hover:bg-[#E6AA68] hover:shadow-lg transition-all"
                        >
                            Go to Settings →
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- FULL SCREEN LOADER --- */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-[#FDFBF7]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="relative mb-10">
                <div className="w-40 h-40 bg-[#2D3748] rounded-full flex items-center justify-center shadow-2xl border-8 border-[#E6AA68] animate-[spin_4s_linear_infinite]">
                    <span className="text-7xl">🧭</span>
                </div>
                <div className="absolute -top-6 -right-6 text-5xl animate-bounce delay-75">✨</div>
                <div className="absolute bottom-0 -left-8 text-5xl animate-bounce delay-300">🤖</div>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-[#2D3748] mb-6 text-center tracking-tight">
                {analyzing ? "Scouting Matches..." : "Analysis Complete!"}
            </h2>
            <p className="text-xl text-[#2D3748]/70 mb-12 text-center max-w-lg font-medium leading-relaxed">
                {analyzing
                    ? "Our AI agent is reading through job descriptions to find your perfect fit."
                    : "We found new matches for you!"}
            </p>

            <button
                onClick={() => {
                  setShowOverlay(false);
                  overlayDismissedRef.current = true;
                }}
                className="bg-white border-2 border-[#2D3748]/10 text-[#2D3748] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#E6AA68]/20 hover:border-[#E6AA68] transition-all shadow-sm active:scale-95 flex items-center gap-2"
            >
                <span>🏃‍♂️</span> {analyzing ? "Let me browse while you work" : "Show me the jobs"}
            </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FDFBF7]/80 backdrop-blur-md z-20 flex flex-col border-b-2 border-[#E6AA68]/20">
          <div className="p-5 flex justify-between items-center">
             <h2 className="text-2xl font-black text-[#2D3748]">AI Suggestions</h2>
             <button
                onClick={runAIFilter}
                disabled={analyzing || analysisStatus.status === 'IN_PROGRESS'}
                className={`
                    px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-100 disabled:cursor-progress
                    ${analyzing ? 'bg-[#E6AA68]/20 text-[#2D3748] border-2 border-[#E6AA68]' : 'bg-[#2D3748] text-white hover:bg-[#E6AA68]'}
                `}
             >
                {analyzing ? (
                    <>
                        <div className="w-4 h-4 border-2 border-[#2D3748] border-t-transparent rounded-full animate-spin"></div>
                        Agent is Scouting...
                    </>
                ) : (
                    <>
                        <span>✨</span> Scout Matches
                    </>
                )}
             </button>
          </div>
          
          {/* Filters Toolbar - Modernized */}
          <div className="px-6 pb-4 flex items-center gap-6">
              
              {/* Applied Filter */}
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-[#2D3748]/10">
                  <button
                    onClick={() => setFilterApplied('all')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterApplied === 'all' ? 'bg-[#2D3748] text-white shadow-md' : 'text-[#2D3748]/60 hover:bg-gray-100'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterApplied('applied')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterApplied === 'applied' ? 'bg-[#E6AA68] text-white shadow-md' : 'text-[#2D3748]/60 hover:bg-gray-100'}`}
                  >
                    Applied
                  </button>
                  <button
                    onClick={() => setFilterApplied('not_applied')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterApplied === 'not_applied' ? 'bg-gray-200 text-[#2D3748] shadow-inner' : 'text-[#2D3748]/60 hover:bg-gray-100'}`}
                  >
                    To Apply
                  </button>
              </div>

              {/* Limit Filter */}
              <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-bold text-[#2D3748]/40 uppercase tracking-wider">Show</span>
                  <div className="flex bg-white rounded-xl p-1 shadow-sm border border-[#2D3748]/10">
                      {[10, 20, 50].map((limit) => (
                          <button
                            key={limit}
                            onClick={() => setFilterLimit(limit)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${filterLimit === limit ? 'bg-[#2D3748] text-white shadow-md' : 'text-[#2D3748]/60 hover:bg-gray-100'}`}
                          >
                              {limit}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-1 overflow-hidden p-6 transition-all duration-500 ease-in-out ${selectedJob ? 'gap-8' : 'gap-0'}`}>

        {/* LEFT: Results List */}
        <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${selectedJob ? 'w-5/12' : 'w-full max-w-4xl mx-auto'}`}>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E6AA68]/50">
                {relevantJobs.length === 0 && !analyzing && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <div className="text-6xl mb-4 grayscale">✨</div>
                        <p className="font-bold text-lg">No suggestions yet.</p>
                        <p className="text-sm">Click the button to let the AI find your best matches.</p>
                        <p className="text-xs mt-2 opacity-60">(Or try adjusting your filters)</p>
                    </div>
                )}

                {relevantJobs.map((job) => (
                    <div key={job.linkedin_job_id} className="relative group mb-4">
                        {/* Relevancy Badge */}
                        <div className={`absolute -right-2 -top-2 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${job.relevant ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-400 border border-red-100'}`}>
                            {job.relevant ? 'RELEVANT' : 'NOT RELEVANT'}
                        </div>

                        <JobCard
                            job={job}
                            isSelected={selectedJob?.linkedin_job_id === job.linkedin_job_id}
                            onClick={() => setSelectedJob(job)}
                        />

                        {/* Reason Box */}
                        <div className="ml-4 mr-2 -mt-4 p-3 bg-[#FDFBF7] border-l-2 border-[#E6AA68] text-xs font-medium text-[#2D3748]/70 italic rounded-b-lg shadow-sm">
                            🤖 {job.relevancy_reason}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls (Fixed at Bottom) */}
            <div className="mt-4 pt-4 border-t-2 border-[#2D3748]/5 flex justify-center items-center gap-2">

                {/* Previous Arrow */}
                <button
                onClick={handlePrev}
                disabled={currentPage === 1 || analyzing}
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

                {/* Previous Neighbor */}
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

                {/* Next Neighbor (if full page implies more results) */}
                {relevantJobs.length === filterLimit && (
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
                disabled={analyzing || (relevantJobs.length < filterLimit && relevantJobs.length > 0)}
                className="w-8 h-8 flex items-center justify-center rounded-lg font-bold text-[#2D3748] hover:bg-[#E6AA68]/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Next Page"
                >
                →
                </button>
            </div>
        </div>

        {/* RIGHT: Preview Panel */}
        <div className={`bg-white rounded-[2rem] shadow-xl border-[#2D3748]/5 overflow-hidden flex flex-col relative transition-all duration-500 ease-in-out ${selectedJob ? 'w-7/12 border-2 opacity-100 translate-x-0' : 'w-0 border-0 opacity-0 translate-x-20'}`}>
            {selectedJob ? (
                <>
                    <div className="h-3 bg-[#E6AA68] w-full"></div>
                    <div className="p-8 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-[#2D3748]/20">
                        
                        {/* Applied Prompt */}
                        {showAppliedPrompt && (
                            <div className="bg-[#E6AA68]/20 p-4 rounded-xl mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 border border-[#E6AA68]">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📝</span>
                                    <span className="font-bold text-[#2D3748]">Have you applied to this job?</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => confirmApplied(true)} 
                                        className="px-6 py-2 bg-[#2D3748] text-white rounded-lg text-sm font-bold hover:bg-green-600 shadow-md transition-all active:scale-95"
                                    >
                                        Yes
                                    </button>
                                    <button 
                                        onClick={() => confirmApplied(false)} 
                                        className="px-6 py-2 bg-white text-[#2D3748] border border-[#2D3748]/10 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-start gap-4 mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-[#2D3748] mb-2">{selectedJob.title}</h2>
                                <div className="flex gap-2">
                                    <span className="font-bold text-[#E6AA68]">{selectedJob.company}</span>
                                    <span className="text-[#2D3748]/30">•</span>
                                    <span className="text-[#2D3748]/60">{selectedJob.location}</span>
                                    {selectedJob.applied && (
                                        <>
                                            <span className="text-[#2D3748]/30">•</span>
                                            <span className="text-green-600 font-bold flex items-center gap-1">✅ Applied</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleApplyClick(e, selectedJob.url)}
                                className="bg-[#2D3748] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#E6AA68] hover:shadow-lg transition-all transform hover:-translate-y-1 flex items-center gap-2 whitespace-nowrap group"
                            >
                                Apply Now <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                        <div className="prose max-w-none text-[#2D3748]/80 whitespace-pre-line">
                            {selectedJob.description || "No detailed description available."}
                        </div>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#2D3748]/30 bg-[#FDFBF7]/50">
                    <p className="font-bold text-xl">Select a job to see details</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}