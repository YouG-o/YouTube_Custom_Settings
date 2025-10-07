/**
 * NOTE ON SCRIPT INJECTION:
 * We use script injection to access YouTube's player API and audio context
 * directly from the page context.
 * This is necessary because the Web Audio API cannot be accessed from content scripts.
 */

(() => {
    const LOG_PREFIX = '[YDS]';
    const LOG_CONTEXT = '[AUDIO NORMALIZER]';
    const LOG_COLOR = '#4ade80';  // Green
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

    // Audio processing state
    let isProcessingActive = false;
    let currentVideoElement = null;
    let originalVolumeHandler = null;
    let volumeObserver = null;
    let normalizerButton = null;
    let videoUrl = null;  // Track current video URL to detect changes

    // Web Audio API specific variables
    let audioContext = null;
    let source = null;
    let compressor = null;
    let gainNode = null;
    let destinationNode = null;

    // Settings state
    let currentIntensity = 'medium';
    let manualActivation = false;
    
    // Clean up existing audio processing
    function cleanupAudioProcessing() {
        try {
            if (currentVideoElement) {
                if (originalVolumeHandler) {
                    Object.defineProperty(currentVideoElement, 'volume', originalVolumeHandler);
                }
                
                const currentTime = currentVideoElement.currentTime;
                const wasPlaying = !currentVideoElement.paused;
                
                // Read userVolume from YCS_SETTINGS
                const raw = localStorage.getItem('YCS_SETTINGS');
                const ycsSettings = raw ? JSON.parse(raw) : {};
                const userVolume = ycsSettings.audioNormalizer?.userVolume || 1;
                
                if (source) source.disconnect();
                if (compressor) compressor.disconnect();
                if (gainNode) gainNode.disconnect();
                
                if (audioContext && audioContext.state !== 'closed') {
                    try {
                        audioContext.close();
                    } catch (e) {
                        errorLog('Error closing AudioContext:', e);
                    }
                }
                
                source = null;
                compressor = null;
                gainNode = null;
                audioContext = null;
                
                const videoElement = currentVideoElement;
                const originalSrc = videoElement.src;
                
                if (originalSrc) {
                    videoElement.addEventListener('loadeddata', function restorePlayback() {
                        videoElement.removeEventListener('loadeddata', restorePlayback);
                        
                        videoElement.currentTime = currentTime;
                        
                        try {
                            videoElement.volume = parseFloat(userVolume);
                        } catch (e) {
                            videoElement.volume = 1.0;
                        }
                        
                        if (wasPlaying) {
                            try {
                                videoElement.play().catch(e => {
                                    errorLog('Error resuming playback:', e);
                                });
                            } catch (e) {
                                errorLog('Error calling play():', e);
                            }
                        }
                        
                        log('Video playback restored successfully');
                    });
                    
                    setTimeout(() => {
                        try {
                            const tempSrc = originalSrc;
                            videoElement.src = '';
                            videoElement.src = tempSrc;
                        } catch (e) {
                            errorLog('Error reloading video source:', e);
                        }
                    }, 50);
                }
                
                if (volumeObserver) {
                    volumeObserver.disconnect();
                    volumeObserver = null;
                }
                
                currentVideoElement = null;
            }
            
            isProcessingActive = false;
            log('Audio processing cleaned up');
            
            updateButtonState(false);
        } catch (error) {
            errorLog(`Error cleaning up audio: ${error.message}`);
        }
    }
    
    // Get compressor settings based on intensity
    function getCompressorSettings(intensity) {
        // Read from YCS_SETTINGS
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const customSettings = ycsSettings.audioNormalizer?.customSettings;
        
        // Check if we have custom settings stored
        if (intensity === 'custom' && customSettings) {
            try {
                log('Using custom compressor settings');
                return {
                    threshold: customSettings.threshold || -30,
                    boost: customSettings.boost || 1.2,
                    ratio: customSettings.ratio || 4,
                    attack: customSettings.attack || 0.01,
                    release: customSettings.release || 0.25
                };
            } catch (error) {
                errorLog('Error reading custom settings, falling back to medium:', error);
                intensity = 'medium';
            }
        }
        
        // Predefined settings
        switch (intensity) {
            case 'light':
                return {
                    threshold: -24,
                    boost: 1.1,
                    ratio: 2.5,
                    attack: 0.03,
                    release: 0.25
                };
            case 'medium':
            default:
                return {
                    threshold: -30,
                    boost: 1.2,
                    ratio: 4,
                    attack: 0.01,
                    release: 0.25
                };
            case 'strong':
                return {
                    threshold: -40,
                    boost: 1.4,
                    ratio: 8,
                    attack: 0.002,
                    release: 0.2
                };
        }
    }
    
    // Convert our settings to Web Audio API compressor parameters
    function applyCompressorSettings(compressor, settings) {
        try {
            compressor.threshold.setValueAtTime(settings.threshold, audioContext.currentTime);
            compressor.knee.setValueAtTime(30, audioContext.currentTime);
            compressor.ratio.setValueAtTime(settings.ratio, audioContext.currentTime);
            compressor.attack.setValueAtTime(settings.attack, audioContext.currentTime);
            compressor.release.setValueAtTime(settings.release, audioContext.currentTime);
            log('Compressor settings applied:', settings);
        } catch (error) {
            errorLog('Error applying compressor settings:', error);
        }
    }
    
    // Set up real audio normalizer using Web Audio API
    function setupAudioNormalizer(forceActivate = false) {
        try {
            // Read from YCS_SETTINGS
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            const audioNormalizer = ycsSettings.audioNormalizer || {};
            
            // Check if normalization is enabled in extension settings
            const isEnabled = audioNormalizer.enabled === true;
            if (!isEnabled) {
                if (isProcessingActive) {
                    cleanupAudioProcessing();
                    log('Audio normalizer disabled');
                }
                removeNormalizerButton();
                return false;
            }
            
            // Get the normalization settings
            currentIntensity = audioNormalizer.value || 'medium';
            manualActivation = audioNormalizer.manualActivation === true;
            
            // Handle manual activation - just add the button, don't process audio yet
            if (manualActivation) {
                addNormalizerButton();
                
                // Only proceed if force activate or already active
                const isActive = audioNormalizer.active === true;
                if (!forceActivate && !isActive) {
                    if (isProcessingActive) {
                        cleanupAudioProcessing();
                    }
                    return false;
                }
            } else {
                removeNormalizerButton();
            }
            
            const video = document.querySelector('video');
            if (!video) {
                errorLog('No video element found');
                return false;
            }
            
            videoUrl = window.location.href;
            
            // Save the user's current volume level
            ycsSettings.audioNormalizer.userVolume = video.volume;
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            cleanupAudioProcessing();
            
            log(`Setting up audio normalizer with intensity: ${currentIntensity}`);
            
            currentVideoElement = video;
            
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                log('Created AudioContext');
            } catch (e) {
                errorLog('Failed to create AudioContext:', e);
                return false;
            }
            
            try {
                source = audioContext.createMediaElementSource(video);
                log('Created audio source from video element');
            } catch (e) {
                errorLog('Failed to create audio source:', e);
                cleanupAudioProcessing();
                return false;
            }
            
            const settings = getCompressorSettings(currentIntensity);
            
            try {
                compressor = audioContext.createDynamicsCompressor();
                applyCompressorSettings(compressor, settings);
                log('Created DynamicsCompressor');
            } catch (e) {
                errorLog('Failed to create compressor:', e);
                cleanupAudioProcessing();
                return false;
            }

            try {
                gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(settings.boost, audioContext.currentTime);
                log('Created GainNode with gain:', settings.boost);
            } catch (e) {
                errorLog('Failed to create gain node:', e);
                cleanupAudioProcessing();
                return false;
            }

            try {
                source.connect(compressor);
                compressor.connect(gainNode);
                gainNode.connect(audioContext.destination);
                log('Connected Web Audio nodes (with gain node)');
            } catch (e) {
                errorLog('Failed to connect audio nodes:', e);
                cleanupAudioProcessing();
                return false;
            }
            
            originalVolumeHandler = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
            
            let rawVolume = video.volume;
            
            Object.defineProperty(video, 'volume', {
                get: function() {
                    return rawVolume;
                },
                set: function(newVolume) {
                    rawVolume = newVolume;
                    
                    // Update userVolume in YCS_SETTINGS
                    const raw = localStorage.getItem('YCS_SETTINGS');
                    const ycsSettings = raw ? JSON.parse(raw) : {};
                    if (!ycsSettings.audioNormalizer) ycsSettings.audioNormalizer = {};
                    ycsSettings.audioNormalizer.userVolume = newVolume;
                    localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
                    
                    if (originalVolumeHandler && originalVolumeHandler.set) {
                        originalVolumeHandler.set.call(this, newVolume);
                    }
                },
                configurable: true
            });
            
            volumeObserver = new MutationObserver((mutations) => {
                if (audioContext && gainNode) {
                    const currentVolume = currentVideoElement.volume;
                    log('Detected volume change:', currentVolume);
                }
            });
            
            const volumeControl = document.querySelector('.ytp-volume-panel');
            if (volumeControl) {
                volumeObserver.observe(volumeControl, {
                    attributes: true,
                    attributeFilter: ['aria-valuenow'],
                    subtree: true
                });
            }
            
            updateButtonState(true);
            isProcessingActive = true;
            
            log('Web Audio normalizer setup complete');
            
            if (manualActivation && forceActivate) {
                showNormalizerStatus(true);
            }
            
            return true;
            
        } catch (error) {
            errorLog(`Failed to setup audio normalizer: ${error.message}`);
            cleanupAudioProcessing();
            return false;
        }
    }
    
    // Add normalizer button to YouTube player
    function addNormalizerButton() {
        // If button already exists, don't add it again
        if (normalizerButton && document.body.contains(normalizerButton)) {
            return;
        }
        
        // Remove any existing button to avoid duplicates
        removeNormalizerButton();
        
        // Look for YouTube player controls
        const rightControls = document.querySelector('.ytp-right-controls');
        if (!rightControls) {
            return;
        }
        
        try {
            // Create the button
            normalizerButton = document.createElement('button');
            normalizerButton.className = 'ytp-button ycs-audio-normalizer-button';
            normalizerButton.title = 'Toggle Audio Normalizer';
            
            // Safer way to create the icon without using innerHTML (avoids TrustedHTML issues)
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("height", "100%");
            svg.setAttribute("version", "1.1");
            svg.setAttribute("viewBox", "0 0 36 36");
            svg.setAttribute("width", "100%");
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M8,21 L12,21 L12,16 L8,16 L8,21 Z M14,21 L18,21 L18,9 L14,9 L14,21 Z M20,21 L24,21 L24,3 L20,3 L20,21 Z M26,21 L30,21 L30,11 L26,11 L26,21 Z");
            path.setAttribute("fill", "#fff");
            
            svg.appendChild(path);
            normalizerButton.appendChild(svg);
            
            // Add click handler
            normalizerButton.addEventListener('click', () => {
                // Read from YCS_SETTINGS
                const raw = localStorage.getItem('YCS_SETTINGS');
                const ycsSettings = raw ? JSON.parse(raw) : {};
                const currentState = ycsSettings.audioNormalizer?.active === true;
                const newState = !currentState;
                
                // Update in YCS_SETTINGS
                if (!ycsSettings.audioNormalizer) ycsSettings.audioNormalizer = {};
                ycsSettings.audioNormalizer.active = newState;
                localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
                
                if (newState) {
                    setupAudioNormalizer(true);
                    showNormalizerStatus(true);
                } else {
                    cleanupAudioProcessing();
                    showNormalizerStatus(false);
                }
            });
            
            // Add the button to the controls
            rightControls.insertBefore(normalizerButton, rightControls.firstChild);
            
            // Initialize button state
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            updateButtonState(ycsSettings.audioNormalizer?.active === true);
            
        } catch (error) {
            errorLog(`Failed to create normalizer button: ${error.message}`);
        }
    }
    
    // Remove normalizer button from YouTube player
    function removeNormalizerButton() {
        const buttons = document.querySelectorAll('.ycs-audio-normalizer-button');
        buttons.forEach(button => {
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
            }
        });
        normalizerButton = null;
    }
    
    // Update the button state (active/inactive)
    function updateButtonState(isActive) {
        if (!normalizerButton) return;
        
        if (isActive) {
            normalizerButton.classList.add('ycs-audio-normalizer-active');
            // Use !important to override YouTube's styles
            normalizerButton.style.cssText = 'color: #4ade80 !important'; // Green when active
        } else {
            normalizerButton.classList.remove('ycs-audio-normalizer-active');
            normalizerButton.style.cssText = ''; // Default color when inactive
        }
    }
    
    // Provide visual feedback to the user
    function showNormalizerStatus(isActive = true) {
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const intensity = ycsSettings.audioNormalizer?.value || 'medium';
        
        // Create or update status indicator
        let indicator = document.getElementById('ycs-audio-normalizer-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'ycs-audio-normalizer-indicator';
            indicator.style.position = 'absolute';
            indicator.style.bottom = '60px';
            indicator.style.right = '20px';
            indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            indicator.style.color = isActive ? '#4ade80' : '#f87171'; // Green if active, red if disabled
            indicator.style.padding = '5px 10px';
            indicator.style.borderRadius = '3px';
            indicator.style.fontSize = '12px';
            indicator.style.zIndex = '10000';
            indicator.style.transition = 'opacity 0.3s';
            document.body.appendChild(indicator);
            
            // Hide after 3 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 300);
            }, 3000);
        }
        
        indicator.style.color = isActive ? '#4ade80' : '#f87171';
        
        indicator.textContent = isActive 
            ? `Audio Normalizer: ON (${intensity})` 
            : 'Audio Normalizer: OFF';
        indicator.style.opacity = '1';
    }
    
    // Initialize everything
    function initialize() {
        // When in manual mode, always start inactive
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        
        if (ycsSettings.audioNormalizer?.manualActivation === true) {
            ycsSettings.audioNormalizer.active = false;
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
        }
        
        setupAudioNormalizer();
        
        document.addEventListener('loadstart', (e) => {
            if (e.target instanceof HTMLMediaElement) {
                log('Video loadstart detected - updating normalizer');
                
                const raw = localStorage.getItem('YCS_SETTINGS');
                const ycsSettings = raw ? JSON.parse(raw) : {};
                
                if (ycsSettings.audioNormalizer?.manualActivation === true) {
                    ycsSettings.audioNormalizer.active = false;
                    localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
                    cleanupAudioProcessing();
                }
                
                setTimeout(() => {
                    setupAudioNormalizer();
                }, 100);
            }
        }, true);
        
        window.addEventListener('message', (event) => {
            if (event.source !== window || !event.data || event.data.type !== 'YCS_AUDIO_NORMALIZER_UPDATE') {
                return;
            }
            
            log('Received update message');
            
            if (event.data.toggleState !== undefined) {
                if (event.data.toggleState) {
                    setupAudioNormalizer(true);
                    showNormalizerStatus(true);
                } else {
                    cleanupAudioProcessing();
                    showNormalizerStatus(false);
                }
            } else {
                setupAudioNormalizer();
            }
        });
    }
    
    initialize();
})();