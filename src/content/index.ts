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
    
    // Inject player control script
    injectPlayerScript();
    
    // Setup observers
    setupLoadStartListener();
    setupUrlObserver();
    
    // Apply settings
    applyStoredSettings();
}

// Inject the player script
function injectPlayerScript() {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/playerSettings.js');
    document.documentElement.appendChild(script);
    coreLog('Player settings script injected');
}

// Apply settings by sending them to the injected script
function applyStoredSettings() {
    if (!currentSettings) return;
    
    window.postMessage({
        type: 'YDS_SETTINGS_UPDATE',
        settings: currentSettings
    }, '*');
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