
import { ClipSegment, ParsedTableResult } from '../types';
import { parseTimeToSeconds } from './timeUtils';

export const parseMarkdownTable = (input: string): ParsedTableResult => {
  const lines = input.split('\n').filter(line => line.trim() !== '');
  const clips: ClipSegment[] = [];

  if (lines.length === 0) {
    return { clips: [], errors: [] };
  }

  // 1. Detect Separator Strategy
  // Heuristic: Sample first few lines. 
  // If many pipes -> Pipe (Markdown)
  // If tabs -> Tab (Excel)
  // Else -> Regex (Multi-space)
  const sampleLines = lines.slice(0, 5);
  const pipeCount = sampleLines.reduce((acc, line) => acc + (line.match(/\|/g) || []).length, 0);
  const tabCount = sampleLines.reduce((acc, line) => acc + (line.match(/\t/g) || []).length, 0);

  let strategy: 'pipe' | 'tab' | 'regex' = 'regex';
  
  if (pipeCount >= sampleLines.length) {
    strategy = 'pipe';
  } else if (tabCount > 0) {
    strategy = 'tab';
  }

  // Helper to split lines based on detected strategy
  const splitLine = (line: string): string[] => {
    if (strategy === 'pipe') {
      const parts = line.split('|');
      // Handle Markdown edges: "| col |" splits to ["", "col", ""]
      if (parts.length > 0 && parts[0].trim() === '') parts.shift();
      if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
      return parts.map(p => p.trim());
    } else if (strategy === 'tab') {
      return line.split('\t').map(p => p.trim());
    } else {
      // Fallback: split by 2+ spaces or tabs
      return line.trim().split(/\s{2,}|\t/).map(p => p.trim());
    }
  };

  // 2. Find Header Row
  let headerIdx = -1;
  let colIndices = { file: -1, time: -1, desc: -1 };

  const keywords = {
    file: ['filename', 'file', 'name', 'source', '视频', '文件'],
    time: ['time', 'duration', 'range', 'start', 'end', '时间', '截取', '轴'],
    desc: ['description', 'desc', 'content', 'note', '描述', '内容']
  };

  for (let i = 0; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    let fIdx = -1, tIdx = -1, dIdx = -1;

    cols.forEach((col, idx) => {
      const lower = col.toLowerCase();
      if (keywords.file.some(k => lower.includes(k))) fIdx = idx;
      if (keywords.time.some(k => lower.includes(k))) tIdx = idx;
      if (keywords.desc.some(k => lower.includes(k))) dIdx = idx;
    });

    // We require at least File and Time columns to proceed
    if (fIdx !== -1 && tIdx !== -1) {
      headerIdx = i;
      colIndices = { file: fIdx, time: tIdx, desc: dIdx };
      break;
    }
  }

  if (headerIdx === -1) {
    return { 
      clips: [], 
      errors: [`Could not identify columns. Please ensure your table has headers like 'File' and 'Time'. Detected format: ${strategy}.`] 
    };
  }

  // 3. Parse Data Rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip separator lines (e.g. |---| or ---)
    if (line.replace(/[|\-\s:]/g, '').length === 0) continue;

    const cols = splitLine(line);

    // Ensure row has enough columns
    if (cols.length <= colIndices.file || cols.length <= colIndices.time) continue;

    const fileName = cols[colIndices.file];
    const timeRangeRaw = cols[colIndices.time];
    const description = colIndices.desc !== -1 ? (cols[colIndices.desc] || '') : '';

    if (!fileName || !timeRangeRaw) continue;

    let startSeconds = 0;
    let endSeconds: number | null = null;
    let errorMsg = undefined;

    // Time parsing logic
    const timeRange = timeRangeRaw.replace(/：/g, ':').trim(); 

    if (timeRange.includes('全片段') || timeRange.toLowerCase().includes('full')) {
      startSeconds = 0;
      endSeconds = null;
    } else {
      // Split by "-" or "to"
      const parts = timeRange.split(/-|to/).map(s => s.trim());
      if (parts.length === 2) {
        const start = parseTimeToSeconds(parts[0]);
        const end = parseTimeToSeconds(parts[1]);
        
        if (start !== -1 && end !== -1) {
          startSeconds = start;
          endSeconds = end;
        } else {
          errorMsg = `Invalid time format: ${timeRange}`;
        }
      } else {
        errorMsg = `Invalid range format: ${timeRange}`;
      }
    }

    clips.push({
      id: `clip-${i}`,
      sourceFileName: fileName,
      startTimeStr: timeRangeRaw,
      endTimeStr: timeRangeRaw,
      startSeconds,
      endSeconds,
      description,
      status: errorMsg ? 'error' : 'ready',
      errorMessage: errorMsg
    });
  }

  return { clips, errors: [] };
};
