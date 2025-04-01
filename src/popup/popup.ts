/**
 * This file handles the popup UI interactions and saves settings to storage
 */

// DOM Elements
const videoQualityFeature = document.getElementById('videoQualityFeature') as HTMLInputElement;
const videoQualitySelect = document.getElementById('videoQuality') as HTMLSelectElement;
const videoQualityContainer = document.getElementById('videoQualityContainer') as HTMLDivElement;

const videoSpeedFeature = document.getElementById('videoSpeedFeature') as HTMLInputElement;
const videoSpeedSelect = document.getElementById('videoSpeed') as HTMLSelectElement;
const videoSpeedContainer = document.getElementById('videoSpeedContainer') as HTMLDivElement;

const subtitlesToggle = document.getElementById('subtitlesTranslation') as HTMLInputElement;
const subtitlesPreferenceSelect = document.getElementById('subtitlesLanguage') as HTMLSelectElement;
const subtitlesPreferenceContainer = document.getElementById('subtitlesLanguageContainer') as HTMLDivElement;

const applyShortsSpeed = document.getElementById('applyShortsSpeed') as HTMLInputElement;

// Default settings
const defaultSettings: ExtensionSettings = {
    videoQuality: {
        enabled: false,
        value: 'auto'
    },
    videoSpeed: {
        enabled: false,
        value: 1,
        applyToShorts: true
    },
    subtitlesPreference: {
        enabled: false,
        value: 'original'
    }
};

// Load saved settings from storage
async function loadSettings() {
    try {
        const data = await browser.storage.local.get('settings');
        const settings = data.settings as ExtensionSettings || defaultSettings;
        
        // Apply saved settings to UI
        videoQualityFeature.checked = settings.videoQuality.enabled;
        videoQualitySelect.value = settings.videoQuality.value;
        toggleContainer(videoQualityContainer, videoQualityFeature.checked);
        
        videoSpeedFeature.checked = settings.videoSpeed.enabled;
        videoSpeedSelect.value = String(settings.videoSpeed.value);
        toggleContainer(videoSpeedContainer, videoSpeedFeature.checked);
        applyShortsSpeed.checked = settings.videoSpeed.applyToShorts !== false; // Default to true if undefined

        subtitlesToggle.checked = settings.subtitlesPreference.enabled;
        subtitlesPreferenceSelect.value = settings.subtitlesPreference.value;
        toggleContainer(subtitlesPreferenceContainer, subtitlesToggle.checked);
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Save settings to storage
async function saveSettings() {
    const settings: ExtensionSettings = {
        videoQuality: {
            enabled: videoQualityFeature.checked,
            value: videoQualitySelect.value
        },
        videoSpeed: {
            enabled: videoSpeedFeature.checked,
            value: parseFloat(videoSpeedSelect.value),
            applyToShorts: applyShortsSpeed.checked
        },
        subtitlesPreference: {
            enabled: subtitlesToggle.checked,
            value: subtitlesPreferenceSelect.value
        }
    };
    
    try {
        await browser.storage.local.set({ settings });
        updateActiveTabs(settings);
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// Toggle visibility of container based on checkbox state
function toggleContainer(container: HTMLDivElement, isVisible: boolean) {
    container.style.display = isVisible ? 'block' : 'none';
}

// Update all active YouTube tabs with new settings
async function updateActiveTabs(settings: ExtensionSettings) {
    const tabs = await browser.tabs.query({ url: '*://*.youtube.com/*' });
    
    for (const tab of tabs) {
        if (tab.id) {
            browser.tabs.sendMessage(tab.id, {
                action: 'updateSettings',
                settings: settings
            }).catch(error => {
                console.error(`Failed to update tab ${tab.id}:`, error);
            });
        }
    }
}

// Initialize event listeners
function initEventListeners() {
    // Feature toggles
    videoQualityFeature.addEventListener('change', () => {
        toggleContainer(videoQualityContainer, videoQualityFeature.checked);
        saveSettings();
    });
    
    videoSpeedFeature.addEventListener('change', () => {
        toggleContainer(videoSpeedContainer, videoSpeedFeature.checked);
        saveSettings();
    });

    subtitlesToggle.addEventListener('change', () => {
        toggleContainer(subtitlesPreferenceContainer, subtitlesToggle.checked);
        saveSettings();
    });
    
    // Value changes
    videoQualitySelect.addEventListener('change', saveSettings);
    videoSpeedSelect.addEventListener('change', saveSettings);
    subtitlesPreferenceSelect.addEventListener('change', saveSettings);

    // Fix for the Apply to Shorts toggle - Add click handler to the parent div
    const applyShortsSpeedParent = applyShortsSpeed.parentElement;
    if (applyShortsSpeedParent) {
        applyShortsSpeedParent.addEventListener('click', (e) => {
            // Toggle the checkbox state
            applyShortsSpeed.checked = !applyShortsSpeed.checked;
            // Trigger a change event to run event handlers
            applyShortsSpeed.dispatchEvent(new Event('change'));
        });
    }

    // Add listener for the checkbox itself as well
    applyShortsSpeed.addEventListener('change', saveSettings);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initEventListeners();
});