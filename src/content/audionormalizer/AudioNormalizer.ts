async function syncAudioNormalizerPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.audioNormalizer) {
            localStorage.setItem('yds-audio-normalizer-enabled', JSON.stringify(settings.audioNormalizer.enabled));
            localStorage.setItem('yds-audio-normalizer-value', settings.audioNormalizer.value);
            audioNormalizerLog(`Synced audio normalizer preference from extension storage: ${settings.audioNormalizer.value}`);
        }
    } catch (error) {
        audioNormalizerErrorLog('Error syncing audio normalizer preference:', error);
    }
}

// Call this function during initialization
async function handleAudioNormalizer() {   
    await syncAudioNormalizerPreference(); // Sync audio normalizer preference
    
    // Check if we should apply normalization to current page
    const normalizerEnabled = localStorage.getItem('yds-audio-normalizer-enabled') === 'true';
    if (!normalizerEnabled) {
        audioNormalizerLog('Audio normalizer feature is disabled, not injecting script');
        return;
    }
    
    // If we get here, we need to inject the script
    audioNormalizerLog('Injecting audio normalizer script');
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/AudioNormalizerScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle audio normalizer settings changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'audioNormalizer' &&
        'enabled' in message && typeof message.enabled === 'boolean') {
        
        // Store preference
        audioNormalizerLog(`Setting audio normalizer preference: enabled=${message.enabled}`);
        localStorage.setItem('yds-audio-normalizer-enabled', JSON.stringify(message.enabled));
        
        // Handle value if provided
        if ('value' in message && typeof message.value === 'string') {
            localStorage.setItem('yds-audio-normalizer-value', message.value);
        }
        
        // Reapply normalization if a video is currently playing
        handleAudioNormalizer();
    }
    return true;
});