(function() {
  // Wait for DOM to be ready
  function initWidget() {
    if (document.getElementById('nexus-bot-iframe')) return;

    // Get the script element to extract the base URL
    // This allows the widget.js to know where to point the iframe (the vercel app url)
    const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
    let appUrl = 'https://boot-creator.vercel.app'; // Fallback
    
    if (scriptTag && scriptTag.src) {
      try {
        const urlObj = new URL(scriptTag.src);
        appUrl = urlObj.origin;
      } catch(e) {
        console.error("NexusBot: Could not determine app origin", e);
      }
    }

    const botId = window.nexusBotId;
    if (!botId) {
      console.error("NexusBot: window.nexusBotId is not defined.");
      return;
    }

    // Create Iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${appUrl}/?embed=true&botId=${botId}`;
    iframe.id = 'nexus-bot-iframe';
    
    // Styles for the Iframe (Start small - just the bubble)
    const style = iframe.style;
    style.position = 'fixed';
    style.bottom = '20px';
    style.right = '20px';
    style.width = '80px'; 
    style.height = '80px';
    style.border = 'none';
    style.zIndex = '999999';
    style.borderRadius = '10px';
    style.transition = 'width 0.3s ease, height 0.3s ease, bottom 0.3s, right 0.3s';
    style.boxShadow = 'none'; // Shadow handled inside iframe
    style.colorScheme = 'normal'; // Prevent site dark mode from affecting iframe scrollbars

    document.body.appendChild(iframe);

    // Listen for resize messages from the React App inside the iframe
    window.addEventListener('message', (event) => {
      // Security check: ensure message comes from our app
      if (event.origin !== appUrl) return;

      if (event.data.type === 'nexus-resize') {
        if (event.data.isOpen) {
          // Open State
          if (window.innerWidth < 640) {
             // Mobile: Full screen
             style.width = '100%';
             style.height = '100%';
             style.bottom = '0';
             style.right = '0';
             style.borderRadius = '0';
          } else {
             // Desktop: Popover size
             style.width = '380px';
             style.height = '650px';
             style.maxHeight = '90vh';
             style.borderRadius = '16px';
          }
        } else {
          // Closed State (Bubble only)
          style.width = '80px';
          style.height = '80px';
          style.bottom = '20px';
          style.right = '20px';
          style.borderRadius = '10px';
        }
      }
    });
  }

  // Ensure body exists before appending
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWidget();
  } else {
    document.addEventListener('DOMContentLoaded', initWidget);
  }
})();