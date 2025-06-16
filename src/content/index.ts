coreLog('Content script starting to load...');

let currentSettings: ExtensionSettings | null = null;

// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    
    // Complete default settings
    const defaultSettings = {
        videoQuality: { enabled: false, value: 'auto' },
        videoSpeed: { enabled: false, value: 1, applyToShorts: true },
        subtitlesPreference: { enabled: false, value: 'original' },
        audioNormalizer: { enabled: false, value: 'medium' }
    };
    
    // If no settings, use defaults
    if (!data.settings) {
        currentSettings = defaultSettings as ExtensionSettings;
        return;
    }
    
    // Migrate settings: ensure all required properties exist
    const settings = migrateSettings(data.settings, defaultSettings);
    
    currentSettings = settings as ExtensionSettings;
}

// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();
    
    // Apply settings
    applyStoredSettings();

    // Initialize features
    currentSettings?.videoQuality.enabled && initializeVideoQuality();
    
    currentSettings?.videoSpeed.enabled && initializeVideoSpeed();
    
    currentSettings?.subtitlesPreference.enabled && initializeSubtitlesPreference();

    currentSettings?.audioNormalizer.enabled && initializeAudioNormalizer();
}

// Initialize functions
let videoPlayerListenerInitialized = false;

function initializeVideoPlayerListener() {
    if (!videoPlayerListenerInitialized && (
        currentSettings?.videoQuality.enabled || 
        currentSettings?.videoSpeed.enabled || 
        currentSettings?.subtitlesPreference.enabled ||
        currentSettings?.audioNormalizer.enabled
    )) {
        setupVideoPlayerListener();
        videoPlayerListenerInitialized = true;
    }
}

function initializeVideoQuality() {
    videoQualityLog('Initializing Video Quality setting');
    
    handleVideoQuality();

    initializeVideoPlayerListener();
};

function initializeVideoSpeed() {
    videoSpeedLog('Initializing Video Playback Speed setting');
    
    handleVideoSpeed();
    
    initializeVideoPlayerListener();
};

function initializeSubtitlesPreference() {
    subtitlesLog('Initializing Subtitles setting');
    
    handleSubtitlesPreference();

    initializeVideoPlayerListener();
};

function initializeAudioNormalizer() {
    audioNormalizerLog('Initializing Audio Normalizer setting');
    
    handleAudioNormalizer();

    initializeVideoPlayerListener();
};

// Apply settings by sending them to the injected script
function applyStoredSettings() {
    if (!currentSettings) return;
    
    window.postMessage({
        type: 'YDS_SETTINGS_UPDATE',
        settings: currentSettings
    }, '*');
    
    // Apply settings immediately to current video if it's playing
    if (currentSettings.videoQuality.enabled) {
        handleVideoQuality();
    }
    
    if (currentSettings.videoSpeed.enabled) {
        handleVideoSpeed();
    }
    
    if (currentSettings.subtitlesPreference.enabled) {
        handleSubtitlesPreference();
    }

    if (currentSettings.audioNormalizer.enabled) {
        handleAudioNormalizer();
    }
}

// Message handler for settings updates
browser.runtime.onMessage.addListener((message: unknown) => {
    if (isSettingsMessage(message)) {
        // Update stored settings
        currentSettings = message.settings;
        
        // Apply new settings
        applyStoredSettings();
        return true;
    }
    return true;
});

// Type guard for settings messages
function isSettingsMessage(message: any): message is Message {
    return message && 
           message.action === 'updateSettings' && 
           typeof message.settings === 'object';
}

// Start initialization
initializeFeatures();