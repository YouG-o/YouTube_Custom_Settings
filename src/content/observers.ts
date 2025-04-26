// Flag to track if a quality change was initiated by the user
let userInitiatedChange = false;
// Timeout ID for resetting the user initiated flag
let userChangeTimeout: number | null = null;

// Setup observer for video loading events
function setupLoadStartListener() {
    cleanupLoadStartListener();

    coreLog('Setting up loadstart listener');

    // First, listen for user interactions with quality menu
    document.addEventListener('click', (e) => {
        // Check if the click is on the quality menu or its children
        const target = e.target as HTMLElement;
        if (target.closest('.ytp-settings-menu')) {
            // Set flag when user interacts with settings menu
            userInitiatedChange = true;
            
            // Reset the flag after a delay (giving time for the loadstart to trigger)
            if (userChangeTimeout) {
                window.clearTimeout(userChangeTimeout);
            }
            
            userChangeTimeout = window.setTimeout(() => {
                userInitiatedChange = false;
                userChangeTimeout = null;
            }, 2000); // 2 seconds should be enough for the change to take effect
        }
    }, true);

    loadStartListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        
        // If this loadstart was triggered by a user quality change, don't override it
        if (userInitiatedChange) {
            coreLog('User initiated quality change detected - not applying default settings');
            return;
        }
        
        coreLog('Video source changed - applying settings');
        
        currentSettings?.videoQuality.enabled && handleVideoQuality();
        currentSettings?.videoSpeed.enabled && handleVideoSpeed();
        currentSettings?.subtitlesPreference.enabled && handleSubtitlesPreference();
        currentSettings?.audioNormalizer.enabled && handleAudioNormalizer();
    };

    document.addEventListener('loadstart', loadStartListener, true);
}

// Cleanup the loadstart listener
function cleanupLoadStartListener() {
    if (loadStartListener) {
        document.removeEventListener('loadstart', loadStartListener, true);
        loadStartListener = null;
    }
    
    // Also clear any timeout and reset flag
    if (userChangeTimeout) {
        window.clearTimeout(userChangeTimeout);
        userChangeTimeout = null;
    }
    userInitiatedChange = false;
}