import { useState, useEffect, useRef } from 'react';
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
  status: 'idle' | 'running' | 'completed' | 'failed';
  task_id?: string | null;
  celery_state?: string | null;
  started_at?: string | null;
}

export default function Suggestions() {
  const [analyzing, setAnalyzing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayDismissedRef = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({ status: 'idle' });
  const [relevantJobs, setRelevantJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Load existing suggestions and status on mount
  useEffect(() => {
    fetchSuggestions();
    checkStatus();
  }, []);

  const fetchSuggestions = async () => {
    try {
      // Call the GET endpoint you defined
      const response = await api.get<FilteredJobResponse[]>('/jobs/filter');

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
    } catch (error) {
      console.error("Failed to load suggestions", error);
    }
  };

  const checkStatus = async (): Promise<AnalysisStatus | null> => {
    try {
      const response = await api.get<AnalysisStatus>('/jobs/filter/status');
      setAnalysisStatus(response.data);
      if (response.data.status === 'running') {
        setAnalyzing(true);
        if (!overlayDismissedRef.current) {
          setShowOverlay(true);
        }
      } else {
        overlayDismissedRef.current = false;
      }
      return response.data;
    } catch (error) {
      console.error("Failed to load analysis status", error);
      return null;
    }
  };

  const runAIFilter = async () => {
    setAnalyzing(true);
    setShowOverlay(true);
    overlayDismissedRef.current = false;

    try {
        await api.post('/jobs/filter');

        let attempts = 0;
        const maxAttempts = 30; // 90 seconds timeout

        const interval = setInterval(async () => {
            attempts++;
            try {
                const status = await checkStatus();
                const stillRunning = status?.status === 'running';

                if (!stillRunning || attempts >= maxAttempts) {
                    clearInterval(interval);

                    await fetchSuggestions();
                    setAnalyzing(false);
        
                    overlayDismissedRef.current = false;

                    if (status?.status === 'failed' || attempts >= maxAttempts) {
                        setShowOverlay(false);
                        alert("Analysis finished with an error or timed out. Please try again.");
                    } else {
                        setTimeout(() => setShowOverlay(false), 1500);
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 3000);

    } catch (error: unknown) {
        const apiError = error as { response?: { status: number } };
        if (apiError.response?.status === 409) {
            alert("Analysis already running. Please wait for it to finish.");
        } else {
            console.error("AI Analysis failed", error);
            alert("Failed to trigger analysis. Ensure Backend & Worker are running.");
        }
        setAnalyzing(false);
        setShowOverlay(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">

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
      <div className="bg-[#FDFBF7]/80 backdrop-blur-md z-20 p-5 border-b-2 border-[#E6AA68]/20 flex justify-between items-center">
         <h2 className="text-2xl font-black text-[#2D3748]">AI Suggestions</h2>
         <button
            onClick={runAIFilter}
            disabled={analyzing || analysisStatus.status === 'running'}
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-6 gap-8">

        {/* LEFT: Results List */}
        <div className="w-5/12 flex flex-col overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E6AA68]/50">
            {relevantJobs.length === 0 && !analyzing && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                    <div className="text-6xl mb-4 grayscale">✨</div>
                    <p className="font-bold text-lg">No suggestions yet.</p>
                    <p className="text-sm">Click the button to let the AI find your best matches.</p>
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

        {/* RIGHT: Preview Panel */}
        <div className="w-7/12 bg-white rounded-[2rem] shadow-xl border-2 border-[#2D3748]/5 overflow-hidden flex flex-col relative">
            {selectedJob ? (
                <>
                    <div className="h-3 bg-[#E6AA68] w-full"></div>
                    <div className="p-8 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-[#2D3748]/20">
                        <div className="flex justify-between items-start gap-4 mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-[#2D3748] mb-2">{selectedJob.title}</h2>
                                <div className="flex gap-2">
                                    <span className="font-bold text-[#E6AA68]">{selectedJob.company}</span>
                                    <span className="text-[#2D3748]/30">•</span>
                                    <span className="text-[#2D3748]/60">{selectedJob.location}</span>
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
