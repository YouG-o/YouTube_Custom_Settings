// Setup observer for video loading events
function setupLoadStartListener() {
    cleanupLoadStartListener();

    coreLog('Setting up loadstart listener');

    loadStartListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        
        coreLog('Video source changed - applying settings');
        
        currentSettings?.videoQuality.enabled && handleVideoQuality();

        currentSettings?.videoSpeed.enabled && handleVideoSpeed();

        currentSettings?.subtitlesPreference.enabled && handleSubtitlesPreference();

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