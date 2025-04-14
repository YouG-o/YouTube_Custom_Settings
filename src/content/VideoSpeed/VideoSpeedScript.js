/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_CONTEXT = '[VIDEO SPEED]';
    const LOG_COLOR = '#fca5a5';  // Light red
    const ERROR_COLOR = '#F44336';  // Red

    // Simplified logger functions
    function log(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`,
            `color: ${LOG_COLOR}`,
            ...args
        );
    }

    function errorLog(message, ...args) {
        console.log(
            `%c${LOG_PREFIX}${LOG_CONTEXT} %c${message}`,
            `color: ${LOG_COLOR}`,  // Keep context color for prefix
            `color: ${ERROR_COLOR}`,  // Red color for error message
            ...args
        );
    }

    // Check if current video is a live stream
    function isLiveStream() {
        try {
            // Method 1: Check player data
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            } else if (window.location.pathname.startsWith('/@')) {
                targetId = 'c4-player'; // player for channels main video
            }
            const player = document.getElementById(targetId);
            
            if (player && typeof player.getVideoData === 'function') {
                const videoData = player.getVideoData();
                if (videoData && videoData.isLive) {
                    log('Live stream detected via player data');
                    return true;
                }
            }
            
            // Method 2: Check for live badge in the DOM
            const liveBadge = document.querySelector('.ytp-live-badge');
            if (liveBadge && window.getComputedStyle(liveBadge).display !== 'none') {
                log('Live stream detected via badge');
                return true;
            }
            
            // Method 3: Check URL patterns
            if (window.location.href.includes('/live/')) {
                log('Live stream detected via URL');
                return true;
            }
            
            return false;
        } catch (error) {
            errorLog(`Error checking if stream is live: ${error.message}`);
            return false;
        }
    }

    function setPlaybackSpeed() {
        try {
            // Don't apply speed changes to live streams
            if (isLiveStream()) {
                log('Not changing speed for live stream');
                return false;
            }
            
            // Get speed preference from localStorage
            const speedEnabled = localStorage.getItem('yds-speed-enabled') === 'true';
            if (!speedEnabled) return false;

            const preferredSpeed = parseFloat(localStorage.getItem('yds-speed-value') || '1');
            
            // For speeds above YouTube's limit (2.0), always use direct HTML5 video element manipulation
            if (preferredSpeed > 2.0 || preferredSpeed < 0.25) {
                log('Speed value exceeds YouTube API limit (2.0), using direct video element manipulation');
                const video = document.querySelector('video');
                if (!video) {
                    errorLog('Video element not found');
                    return false;
                }
                
                video.playbackRate = preferredSpeed;
                log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                return true;
            }
            
            // For normal speeds, try to use YouTube's player API first
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            }
            const player = document.getElementById(targetId);
            
            if (!player || typeof player.setPlaybackRate !== 'function') {
                // Fallback to direct video element manipulation if player API is not available
                const video = document.querySelector('video');
                if (!video) {
                    errorLog('Video element not found');
                    return false;
                }
                
                video.playbackRate = preferredSpeed;
                log('Playback speed set to (via HTML5 video element):', preferredSpeed);
                return true;
            }
            
            // Use YouTube player API to set playback rate for normal speeds
            player.setPlaybackRate(preferredSpeed);
            log('Playback speed set to (via YouTube player API):', preferredSpeed);
            return true;
        } catch (error) {
            errorLog(`Failed to set playback speed: ${error.message}`);
            return false;
        }
    }

    // Execute immediately when script is injected
    setPlaybackSpeed();
})();