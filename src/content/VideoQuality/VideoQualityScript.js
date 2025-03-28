/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_STYLES = {
        VIDEO_QUALITY: { context: '[VIDEO QUALITY]', color: '#fcd34d' }
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

    const qualityLog = createLogger(LOG_STYLES.VIDEO_QUALITY);
    const qualityErrorLog = createErrorLogger(LOG_STYLES.VIDEO_QUALITY);

    function setVideoQuality() {
        // Try to get the specified player
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        }
        const player = document.getElementById(targetId);
        if (!player) return false;

        // Get quality preference from localStorage
        const qualityEnabled = localStorage.getItem('yds-quality-enabled') === 'true';
        if (!qualityEnabled) return false;

        const preferredQuality = localStorage.getItem('yds-quality-value') || 'auto';
        
        try {
            // Quality values: 'tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160'
            if (preferredQuality === 'auto') {
                qualityLog('Setting quality to auto (not restricting)');
                return true;
            }
            
            // Set quality for both current video and future ones
            if (player.setPlaybackQualityRange) {
                player.setPlaybackQualityRange(preferredQuality, preferredQuality);
                qualityLog('Quality set to:', preferredQuality);
                return true;
            }
            
            return false;
        } catch (error) {
            qualityErrorLog(`Failed to set quality: ${error.message}`);
            return false;
        }
    }

    // Execute immediately when script is injected
    setVideoQuality();
})();