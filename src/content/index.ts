coreLog('Content script starting to load...');

let currentSettings: ExtensionSettings | null = null;
let loadStartListener: ((e: Event) => void) | null = null;

// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    currentSettings = data.settings as ExtensionSettings || {
        videoQuality: { enabled: false, value: 'auto' },
        videoSpeed: { enabled: false, value: 1 }
    };
}

// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();
    
    // Apply settings
    applyStoredSettings();

    // Initialize features
    currentSettings?.videoQuality.enabled && initializeVideoQuality();
    
    currentSettings?.videoSpeed.enabled && initializeVideoSpeed();

}

// Initialize functions
let loadStartListenerInitialized = false;

function initializeLoadStartListener() {
    if (!loadStartListenerInitialized && (currentSettings?.videoQuality.enabled || currentSettings?.videoSpeed.enabled)) {
            setupLoadStartListener();
        loadStartListenerInitialized = true;
    }
}


function initializeVideoQuality() {
    videoQualityLog('Initializing Video Quality setting');
    
    handleVideoQuality();

    initializeLoadStartListener();
};

function initializeVideoSpeed() {
    videoSpeedLog('Initializing Video Speed setting');
    
    handleVideoSpeed();
    
    initializeLoadStartListener();
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