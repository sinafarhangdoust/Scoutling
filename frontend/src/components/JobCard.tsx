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
        relative p-5 mb-4 rounded-xl cursor-pointer transition-all duration-300 border-2
        group
        ${isSelected 
          ? 'bg-orange-50 border-orange-400 shadow-md translate-x-2' 
          : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-lg hover:-translate-y-1'
        }
      `}
    >
      {/* Selection Marker (The "Soul" indicator) */}
      <div className={`
        absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-r-full transition-all duration-300
        ${isSelected ? 'bg-orange-500 opacity-100' : 'bg-gray-200 opacity-0 group-hover:opacity-100'}
      `}></div>

      <div className="pl-3">
        <h3 className={`font-bold text-lg mb-2 ${isSelected ? 'text-gray-900' : 'text-gray-700 group-hover:text-orange-600'}`}>
          {job.title}
        </h3>

        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="bg-gray-100 p-1.5 rounded-md text-lg leading-none">🏢</span>
            <span className="font-medium line-clamp-1">{job.company || "Unknown"}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm group-hover:bg-white">
              {job.location}
            </span>
            {job.applied !== undefined && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm ${job.applied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                {job.applied ? 'Applied' : 'Not Applied'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}