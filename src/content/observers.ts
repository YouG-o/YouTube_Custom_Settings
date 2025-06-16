// Flag to track if a quality change was initiated by the user
let userInitiatedChange = false;
// Timeout ID for resetting the user initiated flag
let userChangeTimeout: number | null = null;

// Video playing listener (for SPA navigation)
let videoPlayerListener: ((e: Event) => void) | null = null;
let hasInitialPlayerLoadTriggered = false;

// Many events, needed to apply settings as soon as possible on initial load
const allVideoEvents = [
    'loadstart',
    'loadedmetadata', 
    'canplay',
    'playing',
    'play',
    'timeupdate',
    'seeked'
];
let videoEvents = allVideoEvents;

function setupVideoPlayerListener() {
    cleanUpVideoPlayerListener();

    coreLog('Setting up video player listener');

    // Listen for user interactions with quality menu
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.ytp-settings-menu')) {
            userInitiatedChange = true;
            
            if (userChangeTimeout) {
                window.clearTimeout(userChangeTimeout);
            }
            
            userChangeTimeout = window.setTimeout(() => {
                userInitiatedChange = false;
                userChangeTimeout = null;
            }, 2000);
        }
    }, true);

    videoPlayerListener = function(e: Event) {
        if (!(e.target instanceof HTMLVideoElement)) return;
        if ((e.target as any).srcValue === e.target.src) return;
        
        // Skip if user initiated quality change
        if (userInitiatedChange) {
            coreLog('User initiated quality change detected - skipping default settings');
            return;
        }
        
        coreLog('Video source changed.');
        coreLog('🎥 Event:', e.type);

        // Optimize event list after first successful trigger
        if (!hasInitialPlayerLoadTriggered) {
            hasInitialPlayerLoadTriggered = true;
            
            // Clean up current listeners
            cleanUpVideoPlayerListener();
            
            // Keeps only the essential events for SPA navigation
            videoEvents = ['loadstart'];
            coreLog('Optimized video events for SPA navigation');
            
            // Re-setup with optimized events for next navigation
            setupVideoPlayerListener();
        }
        
        applyVideoPlayerSettings();
    };
    
    videoEvents.forEach(eventType => {
        if (videoPlayerListener) {
            document.addEventListener(eventType, videoPlayerListener, true);
        }
    });
}

function cleanUpVideoPlayerListener() {
    if (videoPlayerListener) {
        allVideoEvents.forEach(eventType => {
            document.removeEventListener(eventType, videoPlayerListener!, true);
        });
        videoPlayerListener = null;
    }
    
    // Clean up user change tracking
    if (userChangeTimeout) {
        window.clearTimeout(userChangeTimeout);
        userChangeTimeout = null;
    }
    userInitiatedChange = false;
}