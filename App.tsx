
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { VideoFile, ClipSegment, ParsedTableResult } from './types';
import { parseMarkdownTable } from './utils/parser';
import { generateBatchScript } from './utils/batchGenerator';
import ClipPreview from './components/ClipPreview';
import { 
  Upload, 
  FileVideo, 
  Settings, 
  Scissors, 
  Download, 
  Info,
  TerminalSquare,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

const DEFAULT_MARKDOWN = `| 视频时间轴 | 源视频文件名 | 素材截取时间段 | 对应画面内容描述 |
|---|---|---|---|
| 00:00 - 00:08 | 2.mp4 | 00:20 - 00:28 | 办公室背景变黑 |
| 00:15 - 00:22 | 3.mp4 | 全片段 | 男主闭眼亲上去 |
| 00:30 - 00:35 | 2.mp4 | 01:10 - 01:15 | 两人对视 |`;

const App: React.FC = () => {
  const [files, setFiles] = useState<Map<string, VideoFile>>(new Map());
  const [markdownInput, setMarkdownInput] = useState(DEFAULT_MARKDOWN);
  const [padding, setPadding] = useState<number>(0);
  const [parsedResult, setParsedResult] = useState<ParsedTableResult>({ clips: [], errors: [] });
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isJustUpdated, setIsJustUpdated] = useState(false);

  // Core parsing logic
  const runParse = useCallback(() => {
    const result = parseMarkdownTable(markdownInput);
    setParsedResult(result);
    setLastUpdated(new Date());
    
    // Visual feedback trigger
    setIsJustUpdated(true);
    setTimeout(() => setIsJustUpdated(false), 2000);
  }, [markdownInput]);

  // Handle parsing automatically when input changes (debounced slightly in effect)
  useEffect(() => {
    const timer = setTimeout(() => {
        runParse();
    }, 500); // 500ms debounce to avoid rapid updates while typing
    return () => clearTimeout(timer);
  }, [markdownInput]); // Keep dependency on markdownInput only, runParse depends on it but we want to debounce logic inside effect or via const

  // Manual trigger wrapper
  const handleManualRefresh = () => {
    runParse();
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = new Map<string, VideoFile>(files);
      Array.from(event.target.files).forEach((file: File) => {
        // Create basic video file entry
        const url = URL.createObjectURL(file);
        
        // Hacky way to get duration
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.src = url;
        tempVid.onloadedmetadata = () => {
           newFiles.set(file.name, { file, url, duration: tempVid.duration });
           setFiles(new Map(newFiles)); 
        };
        newFiles.set(file.name, { file, url, duration: 0 });
      });
      setFiles(newFiles);
    }
  }, [files]);

  const handleDownloadScript = () => {
    const scriptContent = generateBatchScript(parsedResult.clips, padding);
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run_cuts_${parsedResult.clips.length}_clips.bat`; // Added count to filename for clarity
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-auto md:h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Scissors size={24} />
            <h1 className="text-xl font-bold tracking-tight text-white">AnimeAutoCut</h1>
          </div>
          <p className="text-xs text-slate-500">Automated Commentary Helper</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          {/* File Upload */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <FileVideo size={16} /> Source Videos
            </h2>
            <div className="relative group">
              <input 
                type="file" 
                multiple 
                accept=".mp4,.mkv,.mov" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-slate-700 group-hover:border-indigo-500 group-hover:bg-slate-800/50 rounded-xl p-6 flex flex-col items-center justify-center transition-all text-center">
                <Upload className="text-slate-500 group-hover:text-indigo-400 mb-2" size={24} />
                <span className="text-sm text-slate-400">Click or Drag Files</span>
                <span className="text-xs text-slate-600 mt-1">Supported: MP4</span>
              </div>
            </div>
            
            {/* File List */}
            {files.size > 0 && (
              <div className="mt-4 space-y-2">
                {Array.from(files.values()).map((f: VideoFile) => (
                  <div key={f.file.name} className="flex items-center gap-2 text-xs bg-slate-800/50 p-2 rounded border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="truncate flex-1">{f.file.name}</span>
                    <span className="text-slate-500">{(f.file.size / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Settings */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Settings size={16} /> Parameters
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Padding (seconds)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.5"
                    value={padding}
                    onChange={(e) => setPadding(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-sm font-mono w-8 text-right">{padding}s</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Adds buffer time to start/end of clips.</p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="pt-4 border-t border-slate-800">
            <button 
              onClick={handleDownloadScript}
              disabled={parsedResult.clips.length === 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-900/20"
            >
              <Download size={18} />
              {parsedResult.clips.length > 0 
                ? `Download .bat (${parsedResult.clips.length})` 
                : 'Download Script'}
            </button>
            <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">
              Requires <span className="text-slate-300">FFmpeg</span> installed on your system. 
              Place the script in the same folder as your videos and run it.
            </p>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navigation */}
        <header className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur">
          <nav className="flex gap-1 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'editor' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Input Editor
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Preview Clips
            </button>
          </nav>
          
          <div className="flex items-center gap-4 text-sm text-slate-400">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${parsedResult.errors.length > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <span>{parsedResult.clips.length} clips parsed</span>
             </div>
          </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          
          {/* Editor Tab */}
          {activeTab === 'editor' && (
            <div className="absolute inset-0 p-6 flex flex-col">
              <div className="bg-slate-800/30 rounded-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">clip_manifest.txt</span>
                      {isJustUpdated && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 animate-pulse">
                          <CheckCircle2 size={12} /> Updated
                        </span>
                      )}
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 hidden md:flex">
                        <Info size={12} />
                        <span>Format: Pipe | Tab | Space</span>
                      </div>
                      <button 
                        onClick={handleManualRefresh}
                        className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium rounded transition border border-slate-600"
                      >
                        <RefreshCw size={12} />
                        Run / Update List
                      </button>
                   </div>
                </div>
                <textarea 
                  className="flex-1 w-full bg-slate-900/50 text-slate-200 p-4 font-mono text-sm focus:outline-none resize-none"
                  value={markdownInput}
                  onChange={(e) => setMarkdownInput(e.target.value)}
                  spellCheck={false}
                  placeholder="Paste your cutting list here. Markdown tables, Excel copied cells, or simple text supported."
                />
              </div>
              
              {parsedResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-sm text-red-300">
                  <h3 className="font-bold mb-1 flex items-center gap-2"><TerminalSquare size={16} /> Parsing Errors</h3>
                  <ul className="list-disc list-inside opacity-80">
                    {parsedResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
             <div className="absolute inset-0 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                   {parsedResult.clips.map((clip) => (
                     <ClipPreview 
                        key={clip.id} 
                        clip={clip} 
                        videoFile={files.get(clip.sourceFileName)}
                        padding={padding}
                     />
                   ))}
                   
                   {parsedResult.clips.length === 0 && (
                     <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <Scissors size={48} className="mb-4 opacity-50" />
                        <p>No clips found. Please check your input syntax.</p>
                     </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
