/**
 * Converts "MM:SS" or "HH:MM:SS" string to seconds.
 * Returns -1 if invalid.
 */
export const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return -1;
  
  const parts = timeStr.trim().split(':').map(part => parseFloat(part));
  
  if (parts.some(isNaN)) return -1;

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // SS
    return parts[0];
  }
  
  return -1;
};

/**
 * Formats seconds back to HH:MM:SS or MM:SS
 */
export const formatSeconds = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};