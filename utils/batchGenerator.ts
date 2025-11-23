import { ClipSegment, VideoFile } from '../types';

export const generateBatchScript = (
  clips: ClipSegment[],
  padding: number
): string => {
  const commands: string[] = [];

  commands.push('@echo off');
  commands.push('chcp 65001 >nul'); // UTF-8 support
  commands.push('echo Starting AnimeAutoCut Batch Processing...');
  commands.push('echo ==========================================');
  commands.push('');

  // Check for FFmpeg
  commands.push('where ffmpeg >nul 2>nul');
  commands.push('if %errorlevel% neq 0 (');
  commands.push('    echo Error: FFmpeg not found in PATH.');
  commands.push('    echo Please download FFmpeg and place it in this folder or add it to your PATH.');
  commands.push('    pause');
  commands.push('    exit /b');
  commands.push(')');
  commands.push('');

  commands.push('if not exist "output" mkdir output');
  commands.push('');

  clips.forEach((clip, index) => {
    if (clip.status === 'error') return;

    // Sanitize description for filename
    const safeDesc = clip.description.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
    const outputName = `output\\${String(index + 1).padStart(3, '0')}_${clip.sourceFileName}_${safeDesc}.mp4`;
    
    const sourceFile = `"${clip.sourceFileName}"`;
    const outputFile = `"${outputName}"`;

    // Padding logic
    const start = Math.max(0, clip.startSeconds - padding);
    
    let durationCmd = '';
    if (clip.endSeconds !== null) {
        // Calculate duration to ensure we cut correctly relative to the NEW start time
        // FFmpeg -ss seeks to start. -t specifies duration.
        // Original duration: end - original_start
        // New duration: (end + padding) - (start - padding) ???
        // Simple logic: if padding is 1s. Start: 10, End: 20.
        // New Start: 9. New End: 21. Duration: 12.
        const end = clip.endSeconds + padding;
        const duration = end - start;
        durationCmd = `-t ${duration.toFixed(3)}`;
    } else {
        // Full clip logic: just start point, no duration limit (until end of file)
    }

    // Command construction
    // -ss before -i is faster (input seeking) but might not be frame perfect without re-encoding.
    // For accuracy in cutting anime, re-encoding is safer, but user asked for "-c copy" in prompt 
    // "Backend uses subprocess call system ffmpeg (-c copy for speed)".
    // We will stick to user request: -c copy.
    // Note: -ss before -i with -c copy can cause keyframe issues (blank video at start).
    // But fast seek is what was requested.
    
    commands.push(`echo Processing: ${outputName}`);
    commands.push(`ffmpeg -hide_banner -loglevel error -ss ${start.toFixed(3)} -i ${sourceFile} ${durationCmd} -c copy ${outputFile}`);
  });

  commands.push('');
  commands.push('echo ==========================================');
  commands.push('echo All Done! Files are in the "output" folder.');
  commands.push('pause');

  return commands.join('\r\n');
};