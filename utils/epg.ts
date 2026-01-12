/**
 * Scrapes GatoTV "Ahora" page using a CORS proxy to get current programming.
 * NOTE: This relies on the HTML structure of a third-party site. 
 * If GatoTV changes their layout, this parser might need updates.
 */
export const fetchGatoEPG = async (): Promise<Record<string, string>> => {
    try {
      // We use the "Guía TV Ahora" page which lists what is playing currently
      const targetUrl = 'https://www.gatotv.com/guia_tv/ahora';
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Proxy fetch failed");
      
      const data = await response.json();
      const htmlContent = data.contents;
  
      if (!htmlContent) return {};
  
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      const epgMap: Record<string, string> = {};
  
      // GatoTV structure logic (Heuristic based on typical table layouts)
      // Usually rows are inside tables or div grids.
      // Strategy: Find elements that look like channel names, then find the program in the same row.
      
      // Look for table rows typically used in EPGs
      const rows = doc.querySelectorAll('tr, div.tbl_EPG_row');
      
      rows.forEach(row => {
          // Attempt to find the channel name cell/div
          // Often contains an image (logo) or a link with the channel name
          const channelNode = row.querySelector('a[href*="/canal/"], img[alt]');
          
          let channelName = '';
          if (channelNode) {
              if (channelNode.tagName === 'IMG') {
                  channelName = (channelNode as HTMLImageElement).alt;
              } else {
                  channelName = channelNode.textContent?.trim() || '';
              }
          }
  
          if (!channelName) return;
  
          // Attempt to find the time/program cell
          // It's usually a cell containing a time format (HH:MM) followed by text
          // We look for cells that are NOT the channel name
          const cells = row.querySelectorAll('td, div');
          let programTitle = '';
  
          // Heuristic: The program is usually the text content with the most length 
          // or specifically styled. Let's grab text that looks like a title.
          for (let i = 0; i < cells.length; i++) {
              const text = cells[i].textContent?.trim() || '';
              // Avoid the channel name itself and short time strings
              if (text && !text.includes(channelName) && text.length > 3) {
                  // Simple check: does it look like a time? "14:00"
                  if (!text.match(/^\d{2}:\d{2}$/)) {
                      programTitle = text;
                      // Often the title is mixed with time "14:00 Los Simpsons", clean it?
                      // For now, take the raw text as it provides context.
                      break; 
                  }
              }
          }
  
          if (channelName && programTitle) {
              // Normalize key: lowercase, remove spaces for better matching
              const key = channelName.toLowerCase().replace(/[^a-z0-9]/g, '');
              epgMap[key] = programTitle;
          }
      });
  
      console.log(`EPG Scraper: Found info for ${Object.keys(epgMap).length} channels.`);
      return epgMap;
  
    } catch (e) {
      console.error("EPG Fetch failed:", e);
      return {};
    }
  };
  
  export const findProgramForChannel = (channelName: string, epgMap: Record<string, string>): string | null => {
      if (!channelName) return null;
      
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const searchKey = normalize(channelName);
      
      // 1. Exact match
      if (epgMap[searchKey]) return epgMap[searchKey];
  
      // 2. Partial match (e.g. "Telefe HD" matches "Telefe")
      const keys = Object.keys(epgMap);
      for (const key of keys) {
          if (searchKey.includes(key) || key.includes(searchKey)) {
              // Avoid matching very short strings to prevent false positives (e.g. "E!" matching "Telefe")
              if (key.length > 2 && searchKey.length > 2) {
                  return epgMap[key];
              }
          }
      }
  
      return null;
  };