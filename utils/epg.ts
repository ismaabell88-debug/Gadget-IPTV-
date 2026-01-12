/**
 * Utility to normalize strings for comparison:
 * - Lowercase
 * - Remove accents (NFD normalization)
 * - Remove non-alphanumeric characters
 */
export const normalizeChannelName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos (é -> e, ü -> u)
    .replace(/[^a-z0-9]/g, "");      // Elimina espacios y símbolos
};

/**
 * Scrapes GatoTV "Ahora" page using a CORS proxy.
 */
export const fetchGatoEPG = async (): Promise<Record<string, string>> => {
    try {
      const targetUrl = 'https://www.gatotv.com/guia_tv/ahora';
      // Use allorigins to bypass CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Proxy fetch failed");
      
      const data = await response.json();
      const htmlContent = data.contents;
  
      if (!htmlContent) return {};
  
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const epgMap: Record<string, string> = {};
  
      // GatoTV structure usually involves tables for the grid
      const rows = doc.querySelectorAll('tr');
      
      rows.forEach(row => {
          // 1. Find Channel Name/Logo
          // Usually in a cell with class 'logo_canal' or just an image with alt text
          const imgNode = row.querySelector('img[alt]');
          let channelName = '';
          
          if (imgNode) {
              channelName = (imgNode as HTMLImageElement).alt;
          } else {
              // Fallback: Check for links with /canal/ in href
              const linkNode = row.querySelector('a[href*="/canal/"]');
              if (linkNode) {
                  channelName = linkNode.textContent?.trim() || '';
              }
          }

          if (!channelName || channelName.length < 2) return;

          // 2. Find Program Title
          // Strategy: Look for the cell that comes AFTER the channel cell, 
          // or look for specific classes used by GatoTV
          let programTitle = '';

          // Specific class lookup
          const titleDiv = row.querySelector('.titulo_programa, .programa_actual, div[style*="font-weight:bold"]');
          if (titleDiv && titleDiv.textContent) {
              programTitle = titleDiv.textContent.trim();
          } 
          
          // Heuristic: Neighboring cell lookup
          if (!programTitle) {
              // Get all cells
              const cells = Array.from(row.querySelectorAll('td'));
              // Find index of cell containing the channel name/img
              const channelCellIndex = cells.findIndex(c => c.querySelector('img') || c.textContent?.includes(channelName));
              
              if (channelCellIndex !== -1 && channelCellIndex + 1 < cells.length) {
                  // The next cell usually contains the program
                  const nextCell = cells[channelCellIndex + 1];
                  const text = nextCell.textContent?.trim();
                  // Check if it looks like a program (not a time, not empty)
                  if (text && text.length > 2 && !text.match(/^\d{1,2}:\d{2}$/)) {
                      programTitle = text;
                  }
              }
          }

          // Fallback: scan all cells for the longest text that isn't the channel name
          if (!programTitle) {
             const cells = row.querySelectorAll('td');
             for (const cell of Array.from(cells)) {
                 const txt = cell.textContent?.trim() || '';
                 if (txt.length > 5 && !txt.includes(channelName) && !normalizeChannelName(txt).includes(normalizeChannelName(channelName))) {
                     // heuristic: exclude simple times
                     if (!txt.match(/^\d{1,2}:\d{2}$/)) {
                        programTitle = txt;
                        break; 
                     }
                 }
             }
          }
  
          if (channelName && programTitle) {
              const key = normalizeChannelName(channelName);
              if (key) {
                  epgMap[key] = programTitle;
              }
          }
      });
  
      console.log(`EPG: Loaded info for ${Object.keys(epgMap).length} channels.`);
      return epgMap;
  
    } catch (e) {
      console.error("EPG Fetch Error:", e);
      return {};
    }
  };
  
  export const findProgramForChannel = (channelName: string, epgMap: Record<string, string>): string | null => {
      if (!channelName) return null;
      
      const searchKey = normalizeChannelName(channelName);
      if (!searchKey) return null;
      
      // 1. Exact Match
      if (epgMap[searchKey]) return epgMap[searchKey];
  
      // 2. Fuzzy Match
      const keys = Object.keys(epgMap);
      
      // Priority A: The playlist name CONTAINS the web name (e.g. "America TV HD" contains "america")
      for (const key of keys) {
          if (searchKey.includes(key) && key.length > 3) {
              return epgMap[key];
          }
      }

      // Priority B: The web name CONTAINS the playlist name (less likely for HD channels, but possible)
      for (const key of keys) {
          if (key.includes(searchKey) && searchKey.length > 3) {
              return epgMap[key];
          }
      }
  
      return null;
  };