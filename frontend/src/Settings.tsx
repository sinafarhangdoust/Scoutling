import { useState, useEffect } from 'react';
import Header from './components/Header';
import ResumeEditor from './components/ResumeEditor';
import api from './api';

export default function Settings() {
  const [resume, setResume] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [instResponse, resumeResponse, countriesResponse, titlesResponse] = await Promise.all([
          api.get<string>('/user/instructions'),
          api.get<string>('/user/resume'),
          api.get<string[]>('/user/job_search_countries'),
          api.get<string[]>('/user/job_search_titles')
        ]);

        setInstructions(instResponse.data || '');
        setResume(resumeResponse.data || '');
        setSelectedCountries(countriesResponse.data || []);
        setJobTitles(titlesResponse.data || []);
      } catch (error) {
        console.error("Failed to load user settings", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await Promise.all([
        api.post('/user/instructions', { instructions: instructions }),
        api.post('/user/resume', { resume: resume }),
        api.post('/user/job_search_countries', { job_search_countries: selectedCountries }),
        api.post('/user/job_search_titles', { job_search_titles: jobTitles })
      ]);

      setMessage({ text: 'Settings saved successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error("Failed to save settings", error);
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-50 font-sans transition-colors duration-300">
      <Header showSearch={false} />

      <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-brand-300 dark:scrollbar-thumb-brand-700">
        <div className="max-w-6xl mx-auto pb-20">
          
          <div className="mb-8 border-b border-brand-200 dark:border-brand-800 pb-4">
            <h1 className="text-2xl font-bold text-brand-900 dark:text-white">Settings</h1>
            <p className="text-sm text-brand-500 dark:text-brand-400 mt-1">Configure your AI scout preferences and profile.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
               <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-8"> {/* Increased spacing */}
              
              {/* Resume Section */}
              <div className="bg-white dark:bg-brand-900 p-6 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 relative z-0">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-brand-900 dark:text-white">Resume Content</h3>
                    <p className="text-sm text-brand-500 dark:text-brand-400">Paste your resume in Markdown format for the best results.</p>
                </div>
                <ResumeEditor 
                  value={resume}
                  onChange={setResume}
                />
              </div>

              {/* Preferences Section */}
              <div className="bg-white dark:bg-brand-900 p-6 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 relative z-0">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-brand-900 dark:text-white">Job Preferences</h3>
                    <p className="text-sm text-brand-500 dark:text-brand-400">Define your target markets and roles.</p>
                </div>

                <div className="space-y-6">
                    {/* Countries */}
                    <div>
                        <label className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">Target Countries</label>
                        <div className="flex flex-wrap gap-2">
                            {['Denmark', 'Netherlands', 'Canada', 'Italy'].map((country) => (
                                <button
                                    key={country}
                                    onClick={() => {
                                        if (selectedCountries.includes(country)) {
                                            setSelectedCountries(selectedCountries.filter(c => c !== country));
                                        } else {
                                            setSelectedCountries([...selectedCountries, country]);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                                        selectedCountries.includes(country)
                                            ? 'bg-primary/10 border-primary text-primary dark:text-primary-light'
                                            : 'bg-white dark:bg-brand-800 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-700'
                                    }`}
                                >
                                    {country}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job Titles */}
                    <div>
                        <label className="block text-sm font-medium text-brand-700 dark:text-brand-300 mb-2">Job Titles (Max 3)</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={jobTitleInput}
                                onChange={(e) => setJobTitleInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (jobTitleInput.trim() && jobTitles.length < 3) {
                                            setJobTitles([...jobTitles, jobTitleInput.trim()]);
                                            setJobTitleInput('');
                                        }
                                    }
                                }}
                                disabled={jobTitles.length >= 3}
                                placeholder="e.g. Backend Engineer"
                                className="flex-1 bg-white dark:bg-brand-800 border border-brand-300 dark:border-brand-700 rounded-md px-3 py-2 text-sm text-brand-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:bg-brand-50 dark:disabled:bg-brand-900"
                            />
                            <button
                                onClick={() => {
                                    if (jobTitleInput.trim() && jobTitles.length < 3) {
                                        setJobTitles([...jobTitles, jobTitleInput.trim()]);
                                        setJobTitleInput('');
                                    }
                                }}
                                disabled={!jobTitleInput.trim() || jobTitles.length >= 3}
                                className="bg-brand-800 dark:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-900 dark:hover:bg-brand-600 disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                        
                        {jobTitles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {jobTitles.map((title, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 bg-brand-100 dark:bg-brand-800 text-brand-800 dark:text-brand-200 px-2.5 py-1 rounded-md text-sm font-medium">
                                        {title}
                                        <button
                                            onClick={() => setJobTitles(jobTitles.filter((_, i) => i !== index))}
                                            className="ml-1 text-brand-500 dark:text-brand-400 hover:text-brand-900 dark:hover:text-white focus:outline-none"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              </div>

              {/* Instructions Section */}
              <div className="bg-white dark:bg-brand-900 p-6 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800 relative z-0">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-brand-900 dark:text-white">Agent Instructions</h3>
                    <p className="text-sm text-brand-500 dark:text-brand-400">Provide specific instructions for the AI agent (e.g. "Focus on remote-first companies").</p>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-32 bg-white dark:bg-brand-800 border border-brand-300 dark:border-brand-700 rounded-md p-3 text-sm text-brand-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="Enter custom instructions..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-brand-200 dark:border-brand-800">
                {message && (
                  <span className={`text-sm font-medium animate-fade-in ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {message.text}
                  </span>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-primary-hover shadow-sm disabled:opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-brand-900"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}