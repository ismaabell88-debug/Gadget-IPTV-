import { Channel } from '../types';

export const parseM3U = (content: string): Channel[] => {
  if (!content) return [];
  
  // Normalize line endings and split
  const lines = content.replace(/\r/g, '').split('\n');
  const playlist: Channel[] = [];
  
  let currentName: string | undefined = undefined;
  let currentGroup: string | undefined = undefined;
  let currentLogo: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Logic to extract metadata from standard M3U tags
      const info = line.substring(8);
      const lastComma = info.lastIndexOf(',');
      
      if (lastComma !== -1) {
        currentName = info.substring(lastComma + 1).trim();
      }
      
      // Try to find logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) currentLogo = logoMatch[1];
      
      // Try to find group
      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) currentGroup = groupMatch[1];

    } else if (line.startsWith('#')) {
      // Ignore other directives/comments
      continue;
    } else {
      // It's a URL line (or garbage, but we assume URL if it looks like one)
      // Check for common URL protocols or at least non-empty string that isn't a comment
      if (line.length > 5 && (line.includes('http') || line.includes('.') || line.includes(':'))) {
        
        // If we didn't find a name in the previous line, try to guess it from the URL or use a generic one
        let finalName = currentName;
        if (!finalName) {
            // Try to extract filename from URL
            const parts = line.split('/');
            const lastPart = parts[parts.length - 1];
            // Remove extension if present
            finalName = lastPart ? lastPart.split('.')[0] : `Channel ${playlist.length + 1}`;
            // If the name looks like a token or random string, revert to generic
            if (finalName.length > 20) finalName = `Channel ${playlist.length + 1}`;
        }

        playlist.push({
          id: Math.random().toString(36).substr(2, 9),
          url: line, 
          name: finalName,
          group: currentGroup || 'General',
          logo: currentLogo
        });

        // Reset metadata for the next block
        currentName = undefined;
        currentGroup = undefined;
        currentLogo = undefined;
      }
    }
  }

  console.log(`Parsed ${playlist.length} channels.`);
  return playlist;
};