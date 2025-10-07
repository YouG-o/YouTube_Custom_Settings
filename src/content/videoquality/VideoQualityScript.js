/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API directly from the page context.
 * This is necessary because the player API is not accessible from the content script context.
 * The injected code only uses YouTube's official player API methods.
 */

(() => {
    const LOG_PREFIX = '[YCS]';
    const LOG_CONTEXT = '[VIDEO QUALITY]';
    const LOG_COLOR = '#fcd34d';
    const ERROR_COLOR = '#F44336';

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
            `color: ${LOG_COLOR}`,
            `color: ${ERROR_COLOR}`,
            ...args
        );
    }

    // Ordered list of quality levels from lowest to highest
    const QUALITY_ORDER = [
        ['tiny', '144p'],
        ['small', '240p'],
        ['medium', '360p'],
        ['large', '480p'],
        ['hd720', '720p'],
        ['hd1080', '1080p'],
        ['hd1440', '2K'],
        ['hd2160', '4K'],
        ['highres', '8K']
    ];

    /**
     * Get the closest available quality to the preferred one.
     * If the preferred quality is not available, returns the next lower available quality.
     * @param {string} preferred - The preferred quality label.
     * @param {string[]} available - The list of available quality labels.
     * @returns {string|null} The closest available quality label, or null if none found.
     */
    function getClosestAvailableQuality(preferred, available) {
        const order = QUALITY_ORDER.map(q => q[0]);
        if (available.includes(preferred)) return preferred;
        const prefIndex = order.indexOf(preferred);
        if (prefIndex === -1) return available[0] || null;
        for (let i = prefIndex - 1; i >= 0; i--) {
            if (available.includes(order[i])) {
                return order[i];
            }
        }
        return available[0] || null;
    }

    function getPreferredAvailableQuality(preferredList, available) {
        for (const quality of preferredList) {
            if (available.includes(quality)) {
                return quality;
            }
        }
        return available[0] || null;
    }

    function getQualityLabel(qualityKey) {
        const found = QUALITY_ORDER.find(q => q[0] === qualityKey);
        return found ? found[1] : qualityKey;
    }

    /**
     * Set the video quality to the preferred or closest available quality.
     * Reads user preference from localStorage.
     * Logs the result in the console.
     * @returns {boolean} True if a quality was set, false otherwise.
     */
    function setVideoQuality() {
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player';
        }
        const player = document.getElementById(targetId);
        if (!player) return false;

        // Read from YCS_SETTINGS
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const videoQuality = ycsSettings.videoQuality || {};
        
        const qualityEnabled = videoQuality.enabled === true;
        if (!qualityEnabled) return false;

        const preferredQuality = videoQuality.value || 'auto';
        const customOrderObj = videoQuality.customOrder || { enabled: false, order: [] };
        const customOrderEnabled = customOrderObj.enabled;
        const customOrder = Array.isArray(customOrderObj.order) ? customOrderObj.order : [];

        try {
            // If customOrder is enabled and not empty, use it with priority
            if (customOrderEnabled && customOrder.length > 0) {
                if (typeof player.getAvailableQualityLevels !== 'function') {
                    errorLog('Player does not support quality listing.');
                    return false;
                }
                const availableQualities = player.getAvailableQualityLevels();
                const qualityToSet = getPreferredAvailableQuality(customOrder, availableQualities);
                if (!qualityToSet) {
                    errorLog('No available quality to set from custom order.');
                    return false;
                }
                const currentQuality = typeof player.getPlaybackQuality === 'function'
                    ? player.getPlaybackQuality()
                    : null;
                if (currentQuality === qualityToSet) {
                    log('Quality already set to:', getQualityLabel(qualityToSet));
                    return true;
                }
                if (player.setPlaybackQualityRange) {
                    player.setPlaybackQualityRange(qualityToSet, qualityToSet);
                    log('Quality set from custom order to:', getQualityLabel(qualityToSet));
                    return true;
                }
                return false;
            }

            // If no customOrder, fallback to preferredQuality
            if (preferredQuality === 'auto') {
                log('Setting quality to auto (not restricting)');
                return true;
            }

            if (typeof player.getAvailableQualityLevels !== 'function') {
                errorLog('Player does not support quality listing.');
                return false;
            }
            const availableQualities = player.getAvailableQualityLevels();
            const qualityToSet = getClosestAvailableQuality(preferredQuality, availableQualities);
            if (!qualityToSet) {
                errorLog('No available quality to set.');
                return false;
            }

            if (player.setPlaybackQualityRange) {
                player.setPlaybackQualityRange(qualityToSet, qualityToSet);
                log('Quality set to:', getQualityLabel(qualityToSet));
                return true;
            }

            return false;
        } catch (error) {
            errorLog(`Failed to set quality: ${error.message}`);
            return false;
        }
    }

    setVideoQuality();
})();