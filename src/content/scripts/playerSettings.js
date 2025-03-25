(() => {
    const LOG_PREFIX = '[YDS]'; // YouTube Default Settings
    const LOG_STYLES = {
        PLAYER: { context: '[PLAYER]', color: '#4CAF50' }
    };

    // Logger function for debugging
    function createLogger(category) {
        return function(...args) {
            const style = `color: ${category.color}; font-weight: bold`;
            console.log(
                `%c${LOG_PREFIX} %c${category.context}`,
                'color: #FFC107; font-weight: bold',
                style,
                ...args
            );
        };
    }

    // Error logger
    function createErrorLogger(category) {
        return function(...args) {
            const style = `color: ${category.color}; font-weight: bold`;
            console.error(
                `%c${LOG_PREFIX} %c${category.context}`,
                'color: #FFC107; font-weight: bold',
                style,
                ...args
            );
        };
    }

    const playerLog = createLogger(LOG_STYLES.PLAYER);
    const playerErrorLog = createErrorLogger(LOG_STYLES.PLAYER);

    // Get stored settings or use defaults
    const storedSettings = {
        videoQuality: {
            enabled: JSON.parse(localStorage.getItem('yds-quality-enabled') || 'false'),
            value: localStorage.getItem('yds-quality-value') || 'auto'
        },
        videoSpeed: {
            enabled: JSON.parse(localStorage.getItem('yds-speed-enabled') || 'false'),
            value: parseFloat(localStorage.getItem('yds-speed-value') || '1')
        }
    };

    // Set playback quality
    function setVideoQuality(quality) {
        try {
            // Get player element
            let targetId = 'movie_player';
            if (window.location.pathname.startsWith('/shorts')) {
                targetId = 'shorts-player';
            }
            const player = document.getElementById(targetId);
            
            if (!player) {
                playerErrorLog('Player not found');
                return false;
            }
            
            // Quality values: 'tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160'
            if (quality === 'auto') {
                playerLog('Setting quality to auto (not restricting)');
                return true;
            }
            
            // Set quality for both current video and future ones
            if (player.setPlaybackQualityRange) {
                player.setPlaybackQualityRange(quality, quality);
                playerLog('Quality set to:', quality);
                return true;
            }
            
            return false;
        } catch (error) {
            playerErrorLog('Failed to set quality:', error);
            return false;
        }
    }

    // Set playback speed
    function setPlaybackSpeed(speed) {
        try {
            const video = document.querySelector('video');
            if (!video) {
                playerErrorLog('Video element not found');
                return false;
            }
            
            video.playbackRate = speed;
            playerLog('Playback speed set to:', speed);
            return true;
        } catch (error) {
            playerErrorLog('Failed to set playback speed:', error);
            return false;
        }
    }

    // Apply settings when video loads or changes
    function setupVideoChangeListener() {
        // Listen for video element changes
        document.addEventListener('loadstart', (event) => {
            if (!(event.target instanceof HTMLVideoElement)) return;
            
            // Wait a moment for player to initialize
            setTimeout(() => {
                applySettings();
            }, 500);
        }, true);
        
        // For initial video
        applySettings();
    }

    // Apply all settings to current video
    function applySettings() {
        if (storedSettings.videoSpeed.enabled) {
            setPlaybackSpeed(storedSettings.videoSpeed.value);
        }
        
        if (storedSettings.videoQuality.enabled) {
            setVideoQuality(storedSettings.videoQuality.value);
        }
    }

    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'YDS_SETTINGS_UPDATE') {
            playerLog('Received settings update');
            
            const settings = event.data.settings;
            if (settings) {
                // Update quality settings
                if (settings.videoQuality) {
                    storedSettings.videoQuality = settings.videoQuality;
                    localStorage.setItem('yds-quality-enabled', JSON.stringify(settings.videoQuality.enabled));
                    localStorage.setItem('yds-quality-value', settings.videoQuality.value);
                    
                    if (settings.videoQuality.enabled) {
                        setVideoQuality(settings.videoQuality.value);
                    }
                }
                
                // Update speed settings
                if (settings.videoSpeed) {
                    storedSettings.videoSpeed = settings.videoSpeed;
                    localStorage.setItem('yds-speed-enabled', JSON.stringify(settings.videoSpeed.enabled));
                    localStorage.setItem('yds-speed-value', settings.videoSpeed.value.toString());
                    
                    if (settings.videoSpeed.enabled) {
                        setPlaybackSpeed(settings.videoSpeed.value);
                    }
                }
            }
        }
    });

    // Initialize
    setupVideoChangeListener();
    playerLog('Player settings script initialized');
})();