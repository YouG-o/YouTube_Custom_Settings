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
                // Restore volume handling
                if (originalVolumeHandler) {
                    Object.defineProperty(currentVideoElement, 'volume', originalVolumeHandler);
                }
                
                // Save the current time and whether video was playing
                const currentTime = currentVideoElement.currentTime;
                const wasPlaying = !currentVideoElement.paused;
                const userVolume = localStorage.getItem('yds-user-volume') || '1';
                
                // Clean up all audio nodes
                if (source) source.disconnect();
                if (compressor) compressor.disconnect();
                if (gainNode) gainNode.disconnect();
                
                // Close the AudioContext
                if (audioContext && audioContext.state !== 'closed') {
                    try {
                        audioContext.close();
                    } catch (e) {
                        errorLog('Error closing AudioContext:', e);
                    }
                }
                
                // Reset all our references
                source = null;
                compressor = null;
                gainNode = null;
                audioContext = null;
                
                // The most reliable way to restore audio: reload the current src
                // This completely restores the default audio path
                const videoElement = currentVideoElement;
                const originalSrc = videoElement.src;
                
                if (originalSrc) {
                    // Create a one-time event listener for when media is ready
                    videoElement.addEventListener('loadeddata', function restorePlayback() {
                        // Remove this listener after it executes once
                        videoElement.removeEventListener('loadeddata', restorePlayback);
                        
                        // Restore time position
                        videoElement.currentTime = currentTime;
                        
                        // Restore volume
                        try {
                            videoElement.volume = parseFloat(userVolume);
                        } catch (e) {
                            videoElement.volume = 1.0;
                        }
                        
                        // Resume playback if it was playing
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
                    
                    // Reload the current src to reset audio path
                    // We're using a small timeout to ensure clean disconnection first
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
                
                // Clean up other resources
                if (volumeObserver) {
                    volumeObserver.disconnect();
                    volumeObserver = null;
                }
                
                currentVideoElement = null;
            }
            
            isProcessingActive = false;
            log('Audio processing cleaned up');
            
            // Update button state if it exists
            updateButtonState(false);
        } catch (error) {
            errorLog(`Error cleaning up audio: ${error.message}`);
        }
    }
    
    // Get compressor settings based on intensity
    function getCompressorSettings(intensity) {
        // Check if we have custom settings stored
        if (intensity === 'custom') {
            try {
                const threshold = parseFloat(localStorage.getItem('yds-custom-threshold') || '0.1');
                const boost = parseFloat(localStorage.getItem('yds-custom-boost') || '1.5');
                const ratio = parseFloat(localStorage.getItem('yds-custom-ratio') || '4'); // <-- ici
                const attack = parseFloat(localStorage.getItem('yds-custom-attack') || '0.01');
                const release = parseFloat(localStorage.getItem('yds-custom-release') || '0.25');
                
                log('Using custom compressor settings');
                return {
                    threshold,
                    boost,
                    ratio, // <-- ici
                    attack,
                    release
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
                    threshold: -24,   // dB, start compressing above this level
                    boost: 1.1,       // Slight boost
                    ratio: 2.5,       // Gentle compression
                    attack: 0.03,     // Seconds
                    release: 0.25     // Seconds
                };
            case 'medium':
            default:
                return {
                    threshold: -30,   // dB, more compression
                    boost: 1.2,
                    ratio: 4,         // Standard compression
                    attack: 0.01,
                    release: 0.25
                };
            case 'strong':
                return {
                    threshold: -40,   // dB, compress almost everything
                    boost: 1.4,
                    ratio: 8,         // Heavy compression
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
            // Check if normalization is enabled in extension settings
            const isEnabled = localStorage.getItem('yds-audio-normalizer-enabled') === 'true';
            if (!isEnabled) {
                if (isProcessingActive) {
                    cleanupAudioProcessing();
                    log('Audio normalizer disabled');
                }
                // Remove button if feature is disabled completely
                removeNormalizerButton();
                return false;
            }
            
            // Get the normalization settings
            currentIntensity = localStorage.getItem('yds-audio-normalizer-value') || 'medium';
            manualActivation = localStorage.getItem('yds-audio-normalizer-manual') === 'true';
            
            // Handle manual activation - just add the button, don't process audio yet
            if (manualActivation) {
                addNormalizerButton();
                
                // Only proceed if force activate or already active
                const isActive = localStorage.getItem('yds-audio-normalizer-active') === 'true';
                if (!forceActivate && !isActive) {
                    // Clean up any existing processing
                    if (isProcessingActive) {
                        cleanupAudioProcessing();
                    }
                    return false;
                }
            } else {
                // Auto mode - remove button if exists
                removeNormalizerButton();
            }
            
            // Find the video element
            const video = document.querySelector('video');
            if (!video) {
                errorLog('No video element found');
                return false;
            }
            
            // Store current URL (for detecting changes)
            videoUrl = window.location.href;
            
            // Save the user's current volume level for restoration later
            localStorage.setItem('yds-user-volume', video.volume.toString());
            
            // First cleanup any existing processing to avoid duplicates
            cleanupAudioProcessing();
            
            log(`Setting up audio normalizer with intensity: ${currentIntensity}`);
            
            // Store reference to video element
            currentVideoElement = video;
            
            // Create AudioContext
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                log('Created AudioContext');
            } catch (e) {
                errorLog('Failed to create AudioContext:', e);
                return false;
            }
            
            // Create source node from video element
            try {
                source = audioContext.createMediaElementSource(video);
                log('Created audio source from video element');
            } catch (e) {
                errorLog('Failed to create audio source:', e);
                cleanupAudioProcessing();
                return false;
            }
            
            // Get compressor settings based on intensity
            const settings = getCompressorSettings(currentIntensity);
            
            // Create a compressor node for normalization
            try {
                compressor = audioContext.createDynamicsCompressor();
                applyCompressorSettings(compressor, settings);
                log('Created DynamicsCompressor');
            } catch (e) {
                errorLog('Failed to create compressor:', e);
                cleanupAudioProcessing();
                return false;
            }

            // Create a gain node to apply the boost setting
            try {
                gainNode = audioContext.createGain();
                // Apply the boost value from settings
                gainNode.gain.setValueAtTime(settings.boost, audioContext.currentTime);
                log('Created GainNode with gain:', settings.boost);
            } catch (e) {
                errorLog('Failed to create gain node:', e);
                cleanupAudioProcessing();
                return false;
            }

            // Connect the audio nodes
            try {
                // Connect source to compressor, compressor to gain, gain to destination
                source.connect(compressor);
                compressor.connect(gainNode);
                gainNode.connect(audioContext.destination);
                log('Connected Web Audio nodes (with gain node)');
            } catch (e) {
                errorLog('Failed to connect audio nodes:', e);
                cleanupAudioProcessing();
                return false;
            }
            
            // Store a reference to the original volume property descriptor
            originalVolumeHandler = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
            
            // Create our wrapped volume property to sync volume changes with the gain node
            let rawVolume = video.volume;
            
            // Override the volume property to maintain our gain when user changes volume
            Object.defineProperty(video, 'volume', {
                get: function() {
                    return rawVolume;
                },
                set: function(newVolume) {
                    // Store the raw volume value
                    rawVolume = newVolume;
                    
                    // Update the saved user volume whenever volume is changed
                    // This ensures we restore to the correct level when disabling
                    localStorage.setItem('yds-user-volume', newVolume.toString());
                    
                    // Call the original setter to maintain expected behavior
                    if (originalVolumeHandler && originalVolumeHandler.set) {
                        originalVolumeHandler.set.call(this, newVolume);
                    }
                },
                configurable: true
            });
            
            // Observe volume changes from YouTube's controls to update our settings
            volumeObserver = new MutationObserver((mutations) => {
                if (audioContext && gainNode) {
                    // When YouTube changes volume in the UI, update our gain to match
                    const currentVolume = currentVideoElement.volume;
                    log('Detected volume change:', currentVolume);
                }
            });
            
            // Look for YouTube's volume controls and observe changes
            const volumeControl = document.querySelector('.ytp-volume-panel');
            if (volumeControl) {
                volumeObserver.observe(volumeControl, {
                    attributes: true,
                    attributeFilter: ['aria-valuenow'],
                    subtree: true
                });
            }
            
            // Update button state to indicate it's active
            updateButtonState(true);
            isProcessingActive = true;
            
            log('Web Audio normalizer setup complete');
            
            // Show a confirmation message to the user
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
            normalizerButton.className = 'ytp-button yds-audio-normalizer-button';
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
                // Toggle the state
                const currentState = localStorage.getItem('yds-audio-normalizer-active') === 'true';
                const newState = !currentState;
                
                // Store the new state
                localStorage.setItem('yds-audio-normalizer-active', JSON.stringify(newState));
                
                // Apply the new state
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
            updateButtonState(localStorage.getItem('yds-audio-normalizer-active') === 'true');
            
        } catch (error) {
            errorLog(`Failed to create normalizer button: ${error.message}`);
        }
    }
    
    // Remove normalizer button from YouTube player
    function removeNormalizerButton() {
        const buttons = document.querySelectorAll('.yds-audio-normalizer-button');
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
            normalizerButton.classList.add('yds-audio-normalizer-active');
            // Use !important to override YouTube's styles
            normalizerButton.style.cssText = 'color: #4ade80 !important'; // Green when active
        } else {
            normalizerButton.classList.remove('yds-audio-normalizer-active');
            normalizerButton.style.cssText = ''; // Default color when inactive
        }
    }
    
    // Provide visual feedback to the user
    function showNormalizerStatus(isActive = true) {
        const intensity = localStorage.getItem('yds-audio-normalizer-value') || 'medium';
        
        // Create or update status indicator
        let indicator = document.getElementById('yds-audio-normalizer-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'yds-audio-normalizer-indicator';
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
        if (localStorage.getItem('yds-audio-normalizer-manual') === 'true') {
            localStorage.setItem('yds-audio-normalizer-active', 'false');
        }
        
        // Initial setup
        setupAudioNormalizer();
        
        // Listen for loadstart events on video elements
        document.addEventListener('loadstart', (e) => {
            if (e.target instanceof HTMLMediaElement) {
                log('Video loadstart detected - updating normalizer');
                
                // When in manual mode and video changes, reset active state
                if (localStorage.getItem('yds-audio-normalizer-manual') === 'true') {
                    localStorage.setItem('yds-audio-normalizer-active', 'false');
                    cleanupAudioProcessing();
                }
                
                // Small delay to ensure video has loaded
                setTimeout(() => {
                    setupAudioNormalizer();
                }, 100);
            }
        }, true);
        
        // Listen for messages from the content script
        window.addEventListener('message', (event) => {
            // Only accept messages from our extension
            if (event.source !== window || !event.data || event.data.type !== 'YDS_AUDIO_NORMALIZER_UPDATE') {
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
                // Just regular update
                setupAudioNormalizer();
            }
        });
    }
    
    // Execute immediately when script is injected
    initialize();
})();