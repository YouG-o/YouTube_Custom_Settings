/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { coreLog } from "./logger";
import { currentSettings } from "../content/index"
import { handleVideoQuality } from "../content/videoquality/VideoQuality";
import { handleVideoSpeed } from "../content/videospeed/VideoSpeed";
import { handleSubtitlesPreference } from "../content/subtitles/SubtitlesPreference";
import { handleAudioNormalizer } from "../content/audionormalizer/AudioNormalizer";

/**
 * Ensures that user settings contain all properties from default settings
 * If a property is missing, it's added with the default value
 */
export function migrateSettings(userSettings: any, defaultSettings: any): any {
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

export function applyVideoPlayerSettings(): void {
    currentSettings?.videoQuality.enabled && handleVideoQuality();
    currentSettings?.videoSpeed.enabled && handleVideoSpeed();
    currentSettings?.subtitlesPreference.enabled && handleSubtitlesPreference();
    currentSettings?.audioNormalizer.enabled && handleAudioNormalizer();
}