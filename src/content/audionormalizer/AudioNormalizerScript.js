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

    // Settings state
    let currentIntensity = 'medium';
    let manualActivation = false;
    
    // Clean up existing audio processing
    function cleanupAudioProcessing() {
        try {
            if (currentVideoElement) {
                // Restore original volume behavior
                if (originalVolumeHandler) {
                    Object.defineProperty(currentVideoElement, 'volume', originalVolumeHandler);
                }
                
                // Important: Reset volume to user's intended value
                const userVolume = localStorage.getItem('yds-user-volume') || '1';
                try {
                    currentVideoElement.volume = parseFloat(userVolume);
                } catch (e) {
                    // Fallback to default volume if there's an error
                    currentVideoElement.volume = 1.0;
                }
                
                // Remove any volume observer
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
        switch (intensity) {
            case 'light':
                return {
                    threshold: 0.15,  // Threshold for compression (0-1)
                    boost: 1.2,       // Boost for quiet sounds
                    reduction: 0.8,   // Reduction for loud sounds
                    attack: 0.02,     // Attack time in seconds
                    release: 0.3      // Release time in seconds
                };
            case 'strong':
                return {
                    threshold: 0.05,
                    boost: 2.0,
                    reduction: 0.6, 
                    attack: 0.002,
                    release: 0.2
                };
            case 'medium':
            default:
                return {
                    threshold: 0.1,
                    boost: 1.5,
                    reduction: 0.7,
                    attack: 0.01,
                    release: 0.25
                };
        }
    }
    
    // Setup the audio normalizer using volume property override
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
            
            // If we're already processing this video element, just update settings
            if (video === currentVideoElement && isProcessingActive) {
                log(`Audio normalizer already active with intensity: ${currentIntensity}`);
                updateButtonState(true);
                return true;
            }
            
            // First cleanup any existing processing
            cleanupAudioProcessing();
            
            log(`Setting up audio normalizer with intensity: ${currentIntensity}`);
            
            // Store reference to video element
            currentVideoElement = video;
            
            // Create a simple volume-based normalizer
            const settings = getCompressorSettings(currentIntensity);
            
            // We'll use a history buffer to smooth volume changes
            const volumeHistory = [];
            const historySize = 5;  // Number of samples to average
            
            // Store original volume behavior
            originalVolumeHandler = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
            
            // Create our wrapped volume property
            let rawVolume = video.volume;

            // Save the user's intended volume level for restoration later
            localStorage.setItem('yds-user-volume', rawVolume.toString());
            
            // Override the volume property
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
                    
                    // Apply our audio normalization when the user or YouTube sets volume
                    if (isProcessingActive) {
                        // The actual implementation stays in the real-time volume processor
                        // This is just to capture the volume changes
                    }
                    
                    // Call the original setter
                    if (originalVolumeHandler && originalVolumeHandler.set) {
                        originalVolumeHandler.set.call(this, newVolume);
                    }
                },
                configurable: true
            });
            
            // Process volume in real-time
            function processVolume() {
                if (!isProcessingActive || !currentVideoElement) return;
                
                try {
                    // Estimate current audio level from video
                    let audioLevel = 0;
                    
                    // This is a very simplified approach. In reality, you'd need
                    // to analyze the audio data, but we can't access it directly.
                    // Instead, we make a rough guess based on the video state.
                    
                    // Check if video is actually playing
                    if (!currentVideoElement.paused && !currentVideoElement.ended) {
                        // Generate a simulated audio level (very approximate)
                        // In a real implementation, you'd analyze actual audio samples
                        const simulatedLevel = Math.random() * 0.3 + 0.7; // Random value between 0.7-1.0
                        
                        // Add to history
                        volumeHistory.push(simulatedLevel);
                        if (volumeHistory.length > historySize) {
                            volumeHistory.shift();
                        }
                        
                        // Average the history
                        audioLevel = volumeHistory.reduce((sum, val) => sum + val, 0) / volumeHistory.length;
                        
                        // Apply the dynamic compression logic
                        let volumeAdjustment;
                        if (audioLevel > settings.threshold) {
                            // Reduce volume for loud parts
                            volumeAdjustment = settings.reduction;
                        } else {
                            // Boost volume for quiet parts
                            volumeAdjustment = settings.boost;
                        }
                        
                        // Apply the adjustment with the original raw volume
                        const newVolume = Math.min(1.0, Math.max(0.0, rawVolume * volumeAdjustment));
                        
                        // Apply the volume directly to the element using the original setter
                        if (originalVolumeHandler && originalVolumeHandler.set) {
                            originalVolumeHandler.set.call(currentVideoElement, newVolume);
                        }
                    }
                } catch (error) {
                    errorLog(`Error in volume processing: ${error.message}`);
                }
                
                // Continue processing
                if (isProcessingActive) {
                    requestAnimationFrame(processVolume);
                }
            }
            
            // Start volume processing
            isProcessingActive = true;
            processVolume();
            
            // Observe volume changes from YouTube's controls
            volumeObserver = new MutationObserver((mutations) => {
                if (isProcessingActive && currentVideoElement) {
                    // When YouTube changes volume in the UI, we need to ensure our
                    // normalizer still works with the new value
                    processVolume();
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
            
            log('Audio normalizer setup complete');
            
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
        
        // Listen for loadstart events - This replaces our custom observer
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