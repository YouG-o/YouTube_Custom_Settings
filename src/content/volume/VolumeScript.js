/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_CONTEXT = '[VOLUME]';
    const LOG_COLOR = '#60a5fa';

    function log(message, ...args) {
        console.log(`%c${LOG_PREFIX}${LOG_CONTEXT} ${message}`, `color: ${LOG_COLOR}`, ...args);
    }

    function getPlayer() {
        let targetId = 'movie_player';
        if (window.location.pathname.startsWith('/shorts')) {
            targetId = 'shorts-player';
        } else if (window.location.pathname.startsWith('/@')) {
            targetId = 'c4-player';
        }
        return document.getElementById(targetId);
    }

    function setDefaultVolume() {
        try {
            const volumeEnabled = localStorage.getItem('yds-volume-enabled') === 'true';
            if (!volumeEnabled) return;

            const volumeValue = parseFloat(localStorage.getItem('yds-volume-value') || '100');
            const clampedVolume = Math.max(0, Math.min(100, volumeValue));

            const player = getPlayer();
            if (player && typeof player.setVolume === 'function' && typeof player.getVolume === 'function') {
                const currentVolume = player.getVolume();
                if (currentVolume !== clampedVolume) {
                    player.setVolume(clampedVolume);
                    log('Default volume set via player.setVolume:', clampedVolume);
                } else {
                    log('Volume already at default value:', clampedVolume);
                }
            }
        } catch (error) {
            log('Error setting default volume:', error);
        }
    }

    document.addEventListener('loadeddata', setDefaultVolume, true);
    setDefaultVolume();
})();