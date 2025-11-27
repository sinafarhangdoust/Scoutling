import { useState } from 'react';
import JobCard from './components/JobCard';
import type { Job } from './types';

export default function Suggestions() {
  const [analyzing, setAnalyzing] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false); // Controls the full-screen loader visibility
  const [relevantJobs, setRelevantJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Mock function to simulate the API call
  const runAIFilter = async () => {
    setAnalyzing(true);
    setShowOverlay(true); // Show the fun loader immediately
    setRelevantJobs([]); // Clear previous results

    try {
        // TODO: Replace with real API call: const response = await api.post('/jobs/filter');

        // Mocking a longer delay to demonstrate the loader (5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5000));

        const mockResponse: Job[] = [
            { id: '1', title: 'Senior Python Engineer', company: 'TechCorp', location: 'Remote', url: '#', relevant: true, relevancy_reason: 'Matches your Python and Remote preference.', description: 'Great job...' },
            { id: '2', title: 'AI Researcher', company: 'OpenAI', location: 'San Francisco', url: '#', relevant: true, relevancy_reason: 'High match for Machine Learning skills.', description: 'Research stuff...' },
            { id: '3', title: 'Java Developer', company: 'LegacyBank', location: 'New York', url: '#', relevant: false, relevancy_reason: 'You requested to avoid Java.', description: 'Legacy stuff...' },
        ];

        setRelevantJobs(mockResponse);

    } catch (error) {
        console.error("AI Analysis failed", error);
    } finally {
        setAnalyzing(false);
        // We only close the overlay automatically if the user hasn't already dismissed it
        // But typically, when results are ready, we want to show them, so we force close it here.
        setShowOverlay(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">

      {/* --- PLAYFUL FULL SCREEN LOADER --- */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-[#FDFBF7]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            {/* Playful Animation Container */}
            <div className="relative mb-10">
                <div className="w-40 h-40 bg-[#2D3748] rounded-full flex items-center justify-center shadow-2xl border-8 border-[#E6AA68] animate-[spin_4s_linear_infinite]">
                    <span className="text-7xl">🧭</span>
                </div>
                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 text-5xl animate-bounce delay-75">✨</div>
                <div className="absolute bottom-0 -left-8 text-5xl animate-bounce delay-300">🤖</div>
                <div className="absolute top-1/2 -right-12 text-3xl animate-pulse">⚡</div>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-[#2D3748] mb-6 text-center tracking-tight">
                Scouting Matches...
            </h2>
            <p className="text-xl text-[#2D3748]/70 mb-12 text-center max-w-lg font-medium leading-relaxed">
                Our AI agent is reading through thousands of job descriptions to find the perfect fit for your resume.
            </p>

            {/* Dismiss Button (Allows background processing) */}
            <button
                onClick={() => setShowOverlay(false)}
                className="bg-white border-2 border-[#2D3748]/10 text-[#2D3748] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#E6AA68]/20 hover:border-[#E6AA68] transition-all transform hover:scale-105 shadow-sm active:scale-95 flex items-center gap-2"
            >
                <span>🏃‍♂️</span> Let me browse while you work
            </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FDFBF7]/80 backdrop-blur-md z-20 p-5 border-b-2 border-[#E6AA68]/20 flex justify-between items-center">
         <h2 className="text-2xl font-black text-[#2D3748]">AI Suggestions</h2>
         <button
            onClick={runAIFilter}
            disabled={analyzing}
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
                <div key={job.id} className="relative group">
                    {/* Relevancy Badge */}
                    <div className={`absolute -right-2 -top-2 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${job.relevant ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-400 border border-red-100'}`}>
                        {job.relevant ? 'RELEVANT' : 'NOT RELEVANT'}
                    </div>

                    <JobCard
                        job={job}
                        isSelected={selectedJob?.id === job.id}
                        onClick={() => setSelectedJob(job)}
                    />

                    {/* AI Reason (visible directly in list for quick scanning) */}
                    <div className="mb-6 ml-4 mr-2 -mt-2 p-3 bg-[#FDFBF7] border-l-2 border-[#E6AA68] text-xs font-medium text-[#2D3748]/70 italic rounded-r-lg">
                        🤖 {job.relevancy_reason}
                    </div>
                </div>
            ))}
        </div>

        {/* RIGHT: Preview Panel */}
        <div className="w-7/12 bg-white rounded-[2rem] shadow-xl border-2 border-[#2D3748]/5 overflow-hidden flex flex-col relative">
            {selectedJob ? (
                <div className="p-8 overflow-y-auto h-full">
                    <h2 className="text-3xl font-black text-[#2D3748] mb-2">{selectedJob.title}</h2>
                    <p className="font-bold text-[#E6AA68] mb-6">{selectedJob.company}</p>
                    <div className="prose max-w-none text-[#2D3748]/80">
                        {selectedJob.description}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-[#2D3748]/30">
                    <p className="font-bold">Select a job to see details</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}