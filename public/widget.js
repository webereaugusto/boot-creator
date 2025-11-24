(function() {
  // Wait for DOM to be ready
  function initWidget() {
    if (document.getElementById('nexus-bot-iframe')) return;

    // Get the script element to extract the base URL
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

    let extraParams = '';
    try {
       const sbUrl = localStorage.getItem('sb_url');
       const sbKey = localStorage.getItem('sb_key');
       if (sbUrl && sbKey) {
           extraParams = `&sbUrl=${encodeURIComponent(sbUrl)}&sbKey=${encodeURIComponent(sbKey)}`;
       }
    } catch(e) {}

    // Capture current page URL as Origin
    const originUrl = encodeURIComponent(window.location.href);

    // Create Iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${appUrl}/?embed=true&botId=${botId}${extraParams}&origin=${originUrl}`;
    iframe.id = 'nexus-bot-iframe';
    iframe.setAttribute('scrolling', 'no'); 
    iframe.allow = "clipboard-read; clipboard-write"; 
    
    // Styles
    const style = iframe.style;
    style.position = 'fixed';
    style.bottom = '20px';
    style.right = '20px';
    style.width = '80px'; 
    style.height = '80px';
    style.border = 'none';
    style.zIndex = '2147483647';
    style.borderRadius = '10px';
    style.transition = 'width 0.3s ease, height 0.3s ease, bottom 0.3s, right 0.3s';
    style.boxShadow = 'none'; 
    style.colorScheme = 'normal'; 
    style.overflow = 'hidden';
    style.backgroundColor = 'transparent';

    document.body.appendChild(iframe);

    // Listen for resize messages from Iframe
    window.addEventListener('message', (event) => {
      // Basic security check (optional, depending on strictness)
      // if (event.origin !== appUrl) return;

      if (event.data.type === 'nexus-resize') {
        if (event.data.isOpen) {
          // Open State
          if (window.innerWidth < 640) {
             style.width = '100%';
             style.height = '100%';
             style.bottom = '0';
             style.right = '0';
             style.borderRadius = '0';
          } else {
             style.width = '380px';
             style.height = '650px';
             style.maxHeight = '90vh';
             style.borderRadius = '16px';
             style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
          }
        } else {
          // Closed State
          style.width = '80px';
          style.height = '80px';
          style.bottom = '20px';
          style.right = '20px';
          style.borderRadius = '10px';
          style.boxShadow = 'none';
        }
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWidget();
  } else {
    window.addEventListener('DOMContentLoaded', initWidget);
    window.addEventListener('load', initWidget); 
  }
})();