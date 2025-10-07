/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { videoQualityLog, videoQualityErrorLog } from "../../utils/logger";


async function syncVideoQualityPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.videoQuality) {
            // Read current YCS_SETTINGS object
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            
            // Update only videoQuality property
            ycsSettings.videoQuality = settings.videoQuality;
            
            // Write back
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            videoQualityLog(`Synced video quality preference from extension storage: ${settings.videoQuality.value}`);
        }
    } catch (error) {
        videoQualityErrorLog('Error syncing video quality preference:', error);
    }
}

// Call this function during initialization
export async function handleVideoQuality() {   
    //videoQualityLog('Initializing video quality management');
    await syncVideoQualityPreference(); // Sync quality preference
    
    // Check if enabled
    const raw = localStorage.getItem('YCS_SETTINGS');
    const ycsSettings = raw ? JSON.parse(raw) : {};
    const qualityEnabled = ycsSettings.videoQuality?.enabled === true;
    
    if (!qualityEnabled) {
        videoQualityLog('Video quality feature is disabled, not injecting script');
        return;
    }
    
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/VideoQualityScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle video quality selection
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'videoQuality' &&
        'quality' in message && typeof message.quality === 'string' &&
        'enabled' in message && typeof message.enabled === 'boolean') {
        
        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        
        // Ensure videoQuality object exists
        if (!ycsSettings.videoQuality) {
            ycsSettings.videoQuality = {};
        }
        
        // Store preference
        videoQualityLog(`Setting video quality preference to: ${message.quality}, enabled: ${message.enabled}`);
        ycsSettings.videoQuality.enabled = message.enabled;
        ycsSettings.videoQuality.value = message.quality;
        
        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
        
        // Reapply quality if a video is currently playing
        handleVideoQuality();
    }
    return true;
});