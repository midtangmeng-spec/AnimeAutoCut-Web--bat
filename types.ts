export interface VideoFile {
  file: File;
  url: string;
  duration: number;
}

export interface ClipSegment {
  id: string;
  sourceFileName: string; // Matches the filename in the table
  startTimeStr: string; // Original string "MM:SS"
  endTimeStr: string;   // Original string "MM:SS" or "Full"
  startSeconds: number;
  endSeconds: number | null; // null implies full duration until end
  description: string;
  status: 'ready' | 'error';
  errorMessage?: string;
}

export interface ParsedTableResult {
  clips: ClipSegment[];
  errors: string[];
}