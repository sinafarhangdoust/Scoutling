import ReactMarkdown from 'react-markdown';

interface ResumeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ResumeEditor({ value, onChange }: ResumeEditorProps) {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[600px] w-full isolate">
      
      {/* Editor Pane */}
      <div className="flex flex-col h-[400px] lg:h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-2 px-1">
          <label className="text-sm font-semibold text-brand-900 dark:text-white flex items-center gap-2">
            <span>✏️</span> Editor
          </label>
          <span className="text-xs text-brand-500 dark:text-brand-400">Markdown Supported</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 w-full bg-brand-50 dark:bg-brand-950 border border-brand-300 dark:border-brand-700 rounded-lg p-4 font-mono text-sm text-brand-900 dark:text-brand-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none scrollbar-thin scrollbar-thumb-brand-300 dark:scrollbar-thumb-brand-700"
          placeholder="# Your Name&#10;&#10;## Experience&#10;..."
        />
      </div>

      {/* Preview Pane */}
      <div className="flex flex-col h-[400px] lg:h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-2 px-1">
          <label className="text-sm font-semibold text-brand-900 dark:text-white flex items-center gap-2">
            <span>👁️</span> Preview
          </label>
        </div>
        <div className="flex-1 w-full bg-white dark:bg-brand-800 border border-brand-200 dark:border-brand-700 rounded-lg p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-200 dark:scrollbar-thumb-brand-600">
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <p className="text-brand-400 italic">Nothing to preview yet...</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}