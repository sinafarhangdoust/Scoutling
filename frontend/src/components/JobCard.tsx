import type { Job } from '../types';

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onClick: () => void;
}

export default function JobCard({ job, isSelected, onClick }: JobCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 mb-3 rounded-lg border cursor-pointer transition-all duration-200 group
        ${isSelected 
          ? 'bg-white dark:bg-brand-900 border-primary ring-1 ring-primary shadow-md z-10' 
          : 'bg-white dark:bg-brand-900 border-brand-200 dark:border-brand-800 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-sm'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-semibold text-base leading-snug line-clamp-2 ${isSelected ? 'text-brand-900 dark:text-white' : 'text-brand-800 dark:text-brand-100 group-hover:text-primary dark:group-hover:text-primary'}`}>
          {job.title}
        </h3>
        {job.applied && (
             <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 ml-2">
                Applied
             </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
            <svg className="w-4 h-4 text-brand-400 dark:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span className="font-medium truncate">{job.company || "Confidential Company"}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-brand-500 dark:text-brand-500">
             <svg className="w-3.5 h-3.5 text-brand-400 dark:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             <span className="truncate">{job.location}</span>
          </div>
      </div>
    </div>
  );
}