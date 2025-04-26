/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_CONTEXT = '[VIDEO QUALITY]';
    const LOG_COLOR = '#fcd34d';  // Light yellow
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

    function setVideoQuality() {
        // Try to get the specified player
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player'; // player for channels main video
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
                log('Setting quality to auto (not restricting)');
                return true;
            }
            
            // Set quality for both current video and future ones
            if (player.setPlaybackQualityRange) {
                player.setPlaybackQualityRange(preferredQuality, preferredQuality);
                log('Quality set to:', preferredQuality);
                return true;
            }
            
            return false;
        } catch (error) {
            errorLog(`Failed to set quality: ${error.message}`);
            return false;
        }
    }

    // Execute immediately when script is injected
    setVideoQuality();
})();