/**
 * Ensures that user settings contain all properties from default settings
 * If a property is missing, it's added with the default value
 */
function migrateSettings(userSettings: any, defaultSettings: any): any {
    // Create a deep copy to avoid modifying the original
    const settings = JSON.parse(JSON.stringify(userSettings));
    let hasChanges = false;
    
    // Check top level properties (features)
    for (const feature in defaultSettings) {
        if (!settings[feature]) {
            settings[feature] = defaultSettings[feature];
            coreLog(`Migration: Added missing feature ${feature}`);
            hasChanges = true;
            continue;
        }
        
        // Check properties inside each feature
        for (const prop in defaultSettings[feature]) {
            if (!(prop in settings[feature])) {
                settings[feature][prop] = defaultSettings[feature][prop];
                coreLog(`Migration: Added missing property ${prop} to ${feature}`);
                hasChanges = true;
            }
        }
    }
    
    // Save changes if needed
    if (hasChanges) {
        browser.storage.local.set({ settings }).catch(err => {
            coreLog('Error saving migrated settings:', err);
        });
    }
    
    return settings;
}

function applyVideoPlayerSettings(): void {
    currentSettings?.videoQuality.enabled && handleVideoQuality();
    currentSettings?.videoSpeed.enabled && handleVideoSpeed();
    currentSettings?.subtitlesPreference.enabled && handleSubtitlesPreference();
    currentSettings?.audioNormalizer.enabled && handleAudioNormalizer();
}