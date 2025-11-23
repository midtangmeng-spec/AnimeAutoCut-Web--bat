import React, { useRef, useEffect, useState } from 'react';
import { ClipSegment, VideoFile } from '../types';
import { Play, RefreshCw, AlertTriangle, Pause } from 'lucide-react';

interface ClipPreviewProps {
  clip: ClipSegment;
  videoFile?: VideoFile; // The matching blob
  padding: number;
}

const ClipPreview: React.FC<ClipPreviewProps> = ({ clip, videoFile, padding }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Calculate actual playback range with padding
  const start = Math.max(0, clip.startSeconds - padding);
  const end = clip.endSeconds ? clip.endSeconds + padding : (videoFile?.duration || 999999);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    // Initial seek
    video.currentTime = start;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = start;
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [clip, videoFile, start, end]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime >= end) {
        videoRef.current.currentTime = start;
      }
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = start;
      setIsPlaying(false);
    }
  };

  if (clip.status === 'error') {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex items-center gap-3 text-red-200">
        <AlertTriangle size={20} />
        <div>
            <p className="font-bold">Error in Row</p>
            <p className="text-sm">{clip.errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-sm">
      <div className="relative aspect-video bg-black">
        {videoFile ? (
          <video
            ref={videoRef}
            src={videoFile.url}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 flex-col gap-2">
            <AlertTriangle size={32} />
            <p>Source file not found: {clip.sourceFileName}</p>
          </div>
        )}
        
        {/* Overlay Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-4">
          <button 
            onClick={togglePlay}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition shadow-lg"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button 
             onClick={reset}
             className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition"
          >
            <RefreshCw size={14} />
          </button>
          <div className="text-xs font-mono text-slate-300 flex-1 text-right">
             {currentTime.toFixed(1)}s / Target: {end.toFixed(1)}s
          </div>
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex justify-between items-start">
            <div>
                <div className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">
                    {clip.sourceFileName}
                </div>
                <p className="text-sm text-slate-200 font-medium">{clip.description}</p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                {clip.startTimeStr} - {clip.endTimeStr.includes('Full') ? 'END' : clip.endTimeStr}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClipPreview;