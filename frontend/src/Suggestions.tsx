import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JobCard from './components/JobCard';
import type { Job } from './types';
import api from './api';

// Helper interface matching your Backend's FilteredJob schema
interface FilteredJobResponse {
  id: number;
  linkedin_job_id: string;
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
  const [filterApplied, setFilterApplied] = useState<string>('all');
  const [filterLimit, setFilterLimit] = useState<number>(10);
  const [start, setStart] = useState(0);

  // Validation Modal State
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [showAppliedPrompt, setShowAppliedPrompt] = useState(false);

  // Calculated values for pagination
  const currentPage = Math.floor(start / filterLimit) + 1;

  useEffect(() => {
    fetchSuggestions(0);
    api.get<AnalysisStatus>('/jobs/filter/status').then(response => {
        setAnalysisStatus(response.data);
        if (response.data.status === 'IN_PROGRESS') {
            startPolling();
        }
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
      fetchSuggestions(0);
  }, [filterApplied, filterLimit]);

  useEffect(() => {
    setShowAppliedPrompt(false);
  }, [selectedJob?.linkedin_job_id]);

  const fetchSuggestions = async (offset: number = 0) => {
    try {
      const params: any = { limit: filterLimit, offset: offset };
      if (filterApplied === 'applied') params.applied = true;
      else if (filterApplied === 'not_applied') params.applied = false;

      const response = await api.get<FilteredJobResponse[]>('/jobs/filter', { params });
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
      if (!overlayDismissedRef.current) {
          setShowOverlay(true);
      }

      let attempts = 0;
      const maxAttempts = 200;

      const interval = setInterval(async () => {
          attempts++;
          try {
              const status = await checkStatus();
              const isRunning = status?.status === 'IN_PROGRESS';

              if (!isRunning || attempts >= maxAttempts) {
                  clearInterval(interval);
                  setAnalyzing(false);
                  await fetchSuggestions(0);
                  overlayDismissedRef.current = false;

                  if (status?.status === 'FAILED' || attempts >= maxAttempts) {
                      setShowOverlay(false);
                  } else {
                      setTimeout(() => setShowOverlay(false), 2000);
                  }
              }
          } catch (err) {
              console.error("Polling error", err);
          }
      }, 3000);
  };

  const runAIFilter = async () => {
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

    overlayDismissedRef.current = false;
    setShowOverlay(true); 
    setAnalyzing(true);

    try {
        await api.post('/jobs/filter');
        startPolling();
    } catch (error: unknown) {
        const apiError = error as { response?: { status: number } };
        if (apiError.response?.status === 409) {
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
    <div className="flex flex-col h-full relative bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-50 font-sans transition-colors duration-300">

      {/* --- VALIDATION MODAL --- */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[60] bg-brand-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-900 w-full max-w-md rounded-lg shadow-2xl border border-brand-200 dark:border-brand-700 p-6">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-brand-900 dark:text-white">Profile Incomplete</h3>
                    <p className="text-sm text-brand-500 dark:text-brand-400 mt-1">
                        The AI agent requires the following information:
                    </p>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-md p-4 mb-6">
                    <ul className="space-y-2">
                        {missingItems.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                                <span className="text-red-500">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowValidationModal(false)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-brand-800 border border-brand-300 dark:border-brand-700 rounded-md text-sm font-medium text-brand-700 dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-brand-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover shadow-sm"
                    >
                        Go to Settings
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- ANALYSIS OVERLAY --- */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-brand-900 flex flex-col items-center justify-center p-8 transition-colors duration-300">
            <div className="mb-8">
                 {analyzing ? (
                     <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-800 border-t-primary rounded-full animate-spin"></div>
                 ) : (
                     <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                         <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                     </div>
                 )}
            </div>

            <h2 className="text-2xl font-bold text-brand-900 dark:text-white mb-2">
                {analyzing ? "AI Agent is Scouting" : "Analysis Complete"}
            </h2>
            <p className="text-brand-500 dark:text-brand-400 mb-8 max-w-md text-center">
                {analyzing
                    ? "Evaluating job descriptions against your resume and preferences..."
                    : "We have updated your suggestions."}
            </p>

            <button
                onClick={() => {
                  setShowOverlay(false);
                  overlayDismissedRef.current = true;
                }}
                className="px-6 py-2 bg-brand-100 dark:bg-brand-800 text-brand-800 dark:text-brand-200 rounded-md font-medium hover:bg-brand-200 dark:hover:bg-brand-700 transition-colors"
            >
                {analyzing ? "Run in Background" : "View Results"}
            </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-brand-900 border-b border-brand-200 dark:border-brand-800 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm transition-colors duration-300">
          <h2 className="text-lg font-bold text-brand-900 dark:text-white">AI Suggestions</h2>
          
          <div className="flex items-center gap-4">
              {/* Filter Group */}
              <div className="flex bg-brand-50 dark:bg-brand-950 rounded-lg p-1 border border-brand-200 dark:border-brand-700">
                  <button
                    onClick={() => setFilterApplied('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterApplied === 'all' ? 'bg-white dark:bg-brand-800 text-brand-900 dark:text-white shadow-sm border border-brand-100 dark:border-brand-700' : 'text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-200'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterApplied('applied')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterApplied === 'applied' ? 'bg-white dark:bg-brand-800 text-brand-900 dark:text-white shadow-sm border border-brand-100 dark:border-brand-700' : 'text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-200'}`}
                  >
                    Applied
                  </button>
                  <button
                    onClick={() => setFilterApplied('not_applied')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterApplied === 'not_applied' ? 'bg-white dark:bg-brand-800 text-brand-900 dark:text-white shadow-sm border border-brand-100 dark:border-brand-700' : 'text-brand-500 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-200'}`}
                  >
                    To Apply
                  </button>
              </div>

              <div className="h-6 w-px bg-brand-200 dark:bg-brand-700"></div>

              <select 
                value={filterLimit}
                onChange={(e) => setFilterLimit(Number(e.target.value))}
                className="bg-white dark:bg-brand-900 border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10 items</option>
                <option value={20}>20 items</option>
                <option value={50}>50 items</option>
              </select>

              <div className="h-6 w-px bg-brand-200 dark:bg-brand-700"></div>

              <button
                onClick={runAIFilter}
                disabled={analyzing || analysisStatus.status === 'IN_PROGRESS'}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-hover shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
                {analyzing ? (
                    <>
                        <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Run Analysis
                    </>
                )}
             </button>
          </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-1 overflow-hidden p-6 transition-all duration-300 ease-in-out ${selectedJob ? 'gap-6' : 'gap-0'}`}>

        {/* LEFT: Results List */}
        <div className={`flex flex-col h-full transition-all duration-300 ease-in-out ${selectedJob ? 'w-5/12' : 'w-full max-w-3xl mx-auto'}`}>

            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brand-300 dark:scrollbar-thumb-brand-700">
                {relevantJobs.length === 0 && !analyzing && (
                    <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-brand-200 dark:border-brand-700 rounded-lg bg-brand-50 dark:bg-brand-900/50">
                        <p className="font-semibold text-brand-700 dark:text-brand-300">No suggestions yet</p>
                        <p className="text-sm text-brand-500 dark:text-brand-400 mt-1">Run the analysis to find matches.</p>
                    </div>
                )}

                {relevantJobs.map((job) => (
                    <div key={job.linkedin_job_id} className="relative group mb-4">
                        <JobCard
                            job={job}
                            isSelected={selectedJob?.linkedin_job_id === job.linkedin_job_id}
                            onClick={() => setSelectedJob(job)}
                        />
                        
                        {/* Relevancy Indicator - Professional */}
                        <div className="flex items-start gap-2 mt-1 px-1">
                             <div className={`mt-1 w-2 h-2 rounded-full ${job.relevant ? 'bg-emerald-500' : 'bg-brand-300 dark:bg-brand-600'}`}></div>
                             <p className="text-xs text-brand-500 dark:text-brand-400 italic leading-relaxed">
                                {job.relevancy_reason}
                             </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-800 flex justify-between items-center">
                <button
                onClick={handlePrev}
                disabled={currentPage === 1 || analyzing}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-600 dark:text-brand-300 hover:bg-white dark:hover:bg-brand-800 hover:shadow-sm border border-transparent hover:border-brand-200 dark:hover:border-brand-700 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                >
                Previous
                </button>

                <span className="text-xs font-medium text-brand-400">Page {currentPage}</span>

                <button
                onClick={handleNext}
                disabled={analyzing || (relevantJobs.length < filterLimit && relevantJobs.length > 0)}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-brand-600 dark:text-brand-300 hover:bg-white dark:hover:bg-brand-800 hover:shadow-sm border border-transparent hover:border-brand-200 dark:hover:border-brand-700 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                >
                Next
                </button>
            </div>
        </div>

        {/* RIGHT: Preview Panel */}
        <div className={`bg-white dark:bg-brand-900 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 overflow-hidden flex flex-col relative transition-all duration-300 ease-in-out ${selectedJob ? 'w-7/12 opacity-100 translate-x-0' : 'w-0 border-0 opacity-0 translate-x-10'}`}>
            {selectedJob ? (
                <div className="flex flex-col h-full">
                     {/* Applied Prompt */}
                     {showAppliedPrompt && (
                        <div className="bg-primary-light dark:bg-primary/20 border-b border-primary/20 p-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-primary-hover dark:text-primary-light">Did you apply to this position?</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => confirmApplied(true)} 
                                    className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover"
                                >
                                    Yes
                                </button>
                                <button 
                                    onClick={() => confirmApplied(false)} 
                                    className="px-3 py-1 bg-white dark:bg-brand-800 border border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-300 text-xs font-semibold rounded hover:bg-brand-50 dark:hover:bg-brand-700"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="px-8 py-6 border-b border-brand-100 dark:border-brand-800 flex justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl font-bold text-brand-900 dark:text-white leading-tight">{selectedJob.title}</h1>
                                {selectedJob.relevant && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wide">
                                        Match
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-brand-500 dark:text-brand-400">
                                <span className="font-medium text-brand-700 dark:text-brand-300">{selectedJob.company}</span>
                                <span>•</span>
                                <span>{selectedJob.location}</span>
                            </div>
                        </div>

                        <button
                            onClick={(e) => handleApplyClick(e, selectedJob.url)}
                            className="flex-shrink-0 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-md font-semibold text-sm shadow-sm transition-colors"
                        >
                            Apply Now
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-brand-200 dark:scrollbar-thumb-brand-700">
                        <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-brand-600 dark:text-brand-300">
                            <h3 className="text-lg font-semibold text-brand-800 dark:text-brand-200 mb-4">Job Description</h3>
                            <p className="whitespace-pre-line leading-relaxed">
                                {selectedJob.description || "No description provided."}
                            </p>
                        </div>
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