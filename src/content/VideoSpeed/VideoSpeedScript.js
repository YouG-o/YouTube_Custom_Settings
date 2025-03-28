/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_STYLES = {
        VIDEO_SPEED: { context: '[VIDEO SPEED]', color: '#fca5a5' }
    };

    function createLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} ${message}`,
                `color: ${category.color}`,
                ...args
            );
        };
    }

    // Create error logger function
    const ERROR_COLOR = '#F44336';  // Red

    function createErrorLogger(category) {
        return (message, ...args) => {
            console.log(
                `%c${LOG_PREFIX}${category.context} %c${message}`,
                `color: ${category.color}`,  // Keep category color for prefix
                `color: ${ERROR_COLOR}`,     // Red color for error message
                ...args
            );
        };
    }

    const speedLog = createLogger(LOG_STYLES.VIDEO_SPEED);
    const speedErrorLog = createErrorLogger(LOG_STYLES.VIDEO_SPEED);

    // Check if current video is a live stream
    function isLiveStream() {
        try {
            // Method 1: Check player data
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            }
            const player = document.getElementById(targetId);
            
            if (player && typeof player.getVideoData === 'function') {
                const videoData = player.getVideoData();
                if (videoData && videoData.isLive) {
                    speedLog('Live stream detected via player data');
                    return true;
                }
            }
            
            // Method 2: Check for live badge in the DOM
            const liveBadge = document.querySelector('.ytp-live-badge');
            if (liveBadge && window.getComputedStyle(liveBadge).display !== 'none') {
                speedLog('Live stream detected via badge');
                return true;
            }
            
            // Method 3: Check URL patterns
            if (window.location.href.includes('/live/')) {
                speedLog('Live stream detected via URL');
                return true;
            }
            
            return false;
        } catch (error) {
            speedErrorLog(`Error checking if stream is live: ${error.message}`);
            return false;
        }
    }

    function setPlaybackSpeed() {
        try {
            // Don't apply speed changes to live streams
            if (isLiveStream()) {
                speedLog('Not changing speed for live stream');
                return false;
            }
            
            // Get speed preference from localStorage
            const speedEnabled = localStorage.getItem('yds-speed-enabled') === 'true';
            if (!speedEnabled) return false;

            const preferredSpeed = parseFloat(localStorage.getItem('yds-speed-value') || '1');
            
            const video = document.querySelector('video');
            if (!video) {
                speedErrorLog('Video element not found');
                return false;
            }
            
            video.playbackRate = preferredSpeed;
            speedLog('Playback speed set to:', preferredSpeed);
            return true;
        } catch (error) {
            speedErrorLog(`Failed to set playback speed: ${error.message}`);
            return false;
        }
    }

    // Execute immediately when script is injected
    setPlaybackSpeed();
})();