/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { volumeLog, volumeErrorLog } from "../../utils/logger";
import { ExtensionSettings } from "../../types/types";

async function syncVolumePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;

        if (settings?.volume) {
            // Read current YCS_SETTINGS object
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            
            // Update only volume property
            ycsSettings.volume = settings.volume;
            
            // Write back
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            volumeLog(`Synced volume preference from extension storage: ${settings.volume.value}`);
        }
    } catch (error) {
        volumeErrorLog('Error syncing volume preference:', error);
    }
}

// Call this function during initialization
export async function handleVolume() {
    await syncVolumePreference();

    // Check if enabled
    const raw = localStorage.getItem('YCS_SETTINGS');
    const ycsSettings = raw ? JSON.parse(raw) : {};
    const volumeEnabled = ycsSettings.volume?.enabled === true;
    
    if (!volumeEnabled) {
        volumeLog('Volume feature is disabled, not injecting script');
        return;
    }

    //volumeLog('Injecting volume script');
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/VolumeScript.js');
    document.documentElement.appendChild(script);
}