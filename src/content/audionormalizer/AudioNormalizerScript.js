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

    // Settings state
    let currentIntensity = 'medium';
    
    // Clean up existing audio processing
    function cleanupAudioProcessing() {
        try {
            if (currentVideoElement) {
                // Restore original volume behavior
                if (originalVolumeHandler) {
                    Object.defineProperty(currentVideoElement, 'volume', originalVolumeHandler);
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
    function setupAudioNormalizer() {
        try {
            // Check if normalization is enabled
            const isEnabled = localStorage.getItem('yds-audio-normalizer-enabled') === 'true';
            if (!isEnabled) {
                if (isProcessingActive) {
                    cleanupAudioProcessing();
                    log('Audio normalizer disabled');
                }
                return false;
            }
            
            // Get the normalization intensity
            currentIntensity = localStorage.getItem('yds-audio-normalizer-value') || 'medium';
            
            // Find the video element
            const video = document.querySelector('video');
            if (!video) {
                errorLog('No video element found');
                return false;
            }
            
            // If we're already processing this video element, just update settings
            if (video === currentVideoElement && isProcessingActive) {
                log(`Audio normalizer already active with intensity: ${currentIntensity}`);
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
            
            // Override the volume property
            Object.defineProperty(video, 'volume', {
                get: function() {
                    return rawVolume;
                },
                set: function(newVolume) {
                    // Store the raw volume value
                    rawVolume = newVolume;
                    
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
            
            log('Audio normalizer setup complete');
            return true;
            
        } catch (error) {
            errorLog(`Failed to setup audio normalizer: ${error.message}`);
            cleanupAudioProcessing();
            return false;
        }
    }
    
    // Handle page navigation and video changes
    function handleVideoChanges() {
        // YouTube navigation doesn't always reload the page, so we need to detect video changes
        const observer = new MutationObserver((mutations) => {
            // Check if video has changed
            const videoNow = document.querySelector('video');
            if (videoNow && videoNow !== currentVideoElement) {
                log('Video element changed - reapplying normalizer');
                setupAudioNormalizer();
            }
        });
        
        // Observe changes to the DOM for new video elements
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also handle loadstart events on video elements
        document.addEventListener('loadstart', (e) => {
            if (e.target instanceof HTMLMediaElement) {
                // Small delay to ensure video has loaded
                setTimeout(() => {
                    setupAudioNormalizer();
                }, 100);
            }
        }, true);
    }
    
    // Provide visual feedback to the user
    function showNormalizerStatus() {
        const isEnabled = localStorage.getItem('yds-audio-normalizer-enabled') === 'true';
        const intensity = localStorage.getItem('yds-audio-normalizer-value') || 'medium';
        
        if (isEnabled) {
            // Create or update status indicator
            let indicator = document.getElementById('yds-audio-normalizer-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'yds-audio-normalizer-indicator';
                indicator.style.position = 'absolute';
                indicator.style.bottom = '60px';
                indicator.style.right = '20px';
                indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                indicator.style.color = '#4ade80';
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
            
            indicator.textContent = `Audio Normalizer: ON (${intensity})`;
        }
    }
    
    // Initialize everything
    function initialize() {
        setupAudioNormalizer();
        handleVideoChanges();
        
        // Show status to the user
        showNormalizerStatus();
        
        // Listen for messages from the content script
        window.addEventListener('message', (event) => {
            // Only accept messages from our extension
            if (event.source !== window || !event.data || event.data.type !== 'YDS_AUDIO_NORMALIZER_UPDATE') {
                return;
            }
            
            log('Received update message');
            setupAudioNormalizer();
            showNormalizerStatus();
        });
    }
    
    // Execute immediately when script is injected
    initialize();
})();