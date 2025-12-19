import { useState, useEffect } from 'react';
import Header from './components/Header';
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
    <div className="flex flex-col h-screen bg-brand-50 text-brand-900 font-sans">
      <Header showSearch={false} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto pb-20">
          
          <div className="mb-8 border-b border-brand-200 pb-4">
            <h1 className="text-2xl font-bold text-brand-900">Settings</h1>
            <p className="text-sm text-brand-500 mt-1">Configure your AI scout preferences and profile.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
               <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Resume Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-200">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-brand-900">Resume Content</h3>
                    <p className="text-sm text-brand-500">Paste the text content of your resume for the AI to analyze.</p>
                </div>
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  className="w-full h-48 bg-brand-50 border border-brand-300 rounded-md p-3 font-mono text-xs text-brand-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-y"
                  placeholder="Paste resume text here..."
                />
              </div>

              {/* Preferences Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-200">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-brand-900">Job Preferences</h3>
                    <p className="text-sm text-brand-500">Define your target markets and roles.</p>
                </div>

                <div className="space-y-6">
                    {/* Countries */}
                    <div>
                        <label className="block text-sm font-medium text-brand-700 mb-2">Target Countries</label>
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
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white border-brand-300 text-brand-600 hover:bg-brand-50'
                                    }`}
                                >
                                    {country}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job Titles */}
                    <div>
                        <label className="block text-sm font-medium text-brand-700 mb-2">Job Titles (Max 3)</label>
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
                                className="flex-1 bg-white border border-brand-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:bg-brand-50"
                            />
                            <button
                                onClick={() => {
                                    if (jobTitleInput.trim() && jobTitles.length < 3) {
                                        setJobTitles([...jobTitles, jobTitleInput.trim()]);
                                        setJobTitleInput('');
                                    }
                                }}
                                disabled={!jobTitleInput.trim() || jobTitles.length >= 3}
                                className="bg-brand-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-900 disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                        
                        {jobTitles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {jobTitles.map((title, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 bg-brand-100 text-brand-800 px-2.5 py-1 rounded-md text-sm font-medium">
                                        {title}
                                        <button
                                            onClick={() => setJobTitles(jobTitles.filter((_, i) => i !== index))}
                                            className="ml-1 text-brand-500 hover:text-brand-900 focus:outline-none"
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
              <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-200">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-brand-900">Agent Instructions</h3>
                    <p className="text-sm text-brand-500">Provide specific instructions for the AI agent (e.g. "Focus on remote-first companies").</p>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-32 bg-white border border-brand-300 rounded-md p-3 text-sm text-brand-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="Enter custom instructions..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-brand-200">
                {message && (
                  <span className={`text-sm font-medium animate-fade-in ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {message.text}
                  </span>
                )}

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-primary-hover shadow-sm disabled:opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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