/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { subtitlesLog, subtitlesErrorLog, coreLog } from "../../utils/logger";


async function syncSubtitlesLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.subtitlesPreference) {
            // Read current YCS_SETTINGS object
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            
            // Update only subtitlesPreference property
            ycsSettings.subtitlesPreference = settings.subtitlesPreference;
            
            // Write back
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            //subtitlesLog(`Synced subtitle language preference from extension storage: ${settings.subtitlesPreference.value}`);
        }
    } catch (error) {
        subtitlesLog('Error syncing subtitle language preference:', error);
    }
}

// Call this function during initialization
export async function handleSubtitlesPreference() {   
    //subtitlesLog('Initializing subtitles feature');
    await syncSubtitlesLanguagePreference(); // Sync language preference
    
    // Check if enabled
    const raw = localStorage.getItem('YCS_SETTINGS');
    const ycsSettings = raw ? JSON.parse(raw) : {};
    const subtitlesEnabled = ycsSettings.subtitlesPreference?.enabled === true;
    
    if (!subtitlesEnabled) {
        subtitlesLog('Subtitles feature is disabled, not injecting script');
        return;
    }
    
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/SubtitlesScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle subtitle language selection
browser.runtime.onMessage.addListener((message: unknown) => {
    coreLog('Received message:', message); // Add debug log
    
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'subtitlesPreference' &&
        'language' in message && typeof message.language === 'string') {
        
        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        
        // Ensure subtitlesPreference object exists
        if (!ycsSettings.subtitlesPreference) {
            ycsSettings.subtitlesPreference = {};
        }
        
        // Update language
        subtitlesLog(`Setting subtitle language preference to: ${message.language}`);
        ycsSettings.subtitlesPreference.value = message.language;
        
        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
        
        // Reapply subtitles if a video is currently playing
        handleSubtitlesPreference();
    }
    return true;
});