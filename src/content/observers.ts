// Setup observer for video loading events
function setupLoadStartListener() {
    cleanupLoadStartListener();

    coreLog('Setting up loadstart listener');

    loadStartListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        
        coreLog('Video source changed - applying settings');
        
        // Delay application to ensure the player is fully loaded
        setTimeout(() => {
            applyStoredSettings();
        }, 500);
    };

    document.addEventListener('loadstart', loadStartListener, true);
}

// Cleanup the loadstart listener
function cleanupLoadStartListener() {
    if (loadStartListener) {
        document.removeEventListener('loadstart', loadStartListener, true);
        loadStartListener = null;
    }
}

// Setup URL observer to detect page changes
function setupUrlObserver() {
    coreLog('Setting up URL observer');
    
    // Standard History API monitoring
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        handleUrlChange();
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        handleUrlChange();
    };
    
    // Browser navigation (back/forward)
    window.addEventListener('popstate', () => {
        handleUrlChange();
    });
    
    // YouTube's custom page data update event
    window.addEventListener('yt-page-data-updated', () => {
        handleUrlChange();
    });
}

// Handle URL changes
function handleUrlChange() {
    coreLog('URL changed, reapplying settings');
    
    // Small delay to ensure the player is loaded
    setTimeout(() => {
        applyStoredSettings();
    }, 1000);
}
