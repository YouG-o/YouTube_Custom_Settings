async function syncVideoSpeedPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.videoSpeed) {
            localStorage.setItem('yds-speed-enabled', JSON.stringify(settings.videoSpeed.enabled));
            localStorage.setItem('yds-speed-value', settings.videoSpeed.value.toString());
            videoSpeedLog(`Synced video speed preference from extension storage: ${settings.videoSpeed.value}`);
        }
    } catch (error) {
        videoSpeedErrorLog('Error syncing video speed preference:', error);
    }
}

// Call this function during initialization
async function handleVideoSpeed() {   
    //videoSpeedLog('Initializing video speed management');
    await syncVideoSpeedPreference(); // Sync speed preference
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/VideoSpeedScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle video speed selection
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'videoSpeed' &&
        'speed' in message && typeof message.speed === 'number' &&
        'enabled' in message && typeof message.enabled === 'boolean') {
        
        // Store preference
        videoSpeedLog(`Setting video speed preference to: ${message.speed}, enabled: ${message.enabled}`);
        localStorage.setItem('yds-speed-enabled', JSON.stringify(message.enabled));
        localStorage.setItem('yds-speed-value', message.speed.toString());
        
        // Reapply speed if a video is currently playing
        handleVideoSpeed();
    }
    return true;
});