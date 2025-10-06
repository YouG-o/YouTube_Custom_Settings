/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { videoSpeedLog, videoSpeedErrorLog } from "../../utils/logger";


async function syncVideoSpeedPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.videoSpeed) {
            localStorage.setItem('ycs-speed-enabled', JSON.stringify(settings.videoSpeed.enabled));
            localStorage.setItem('ycs-speed-value', settings.videoSpeed.value.toString());
            localStorage.setItem('ycs-speed-apply-to-shorts', JSON.stringify(settings.videoSpeed.applyToShorts));
            // Synchronize duration rule settings
            localStorage.setItem('ycs-speed-duration-rule-enabled', JSON.stringify(settings.videoSpeed.durationRuleEnabled ?? false));
            localStorage.setItem('ycs-speed-duration-rule-type', settings.videoSpeed.durationRuleType ?? 'greater');
            localStorage.setItem('ycs-speed-duration-rule-minutes', (settings.videoSpeed.durationRuleMinutes ?? 5).toString());
            //videoSpeedLog(`Synced video speed preference from extension storage: ${settings.videoSpeed.value}`);
        }
    } catch (error) {
        videoSpeedErrorLog('Error syncing video speed preference:', error);
    }
}

// Call this function during initialization
export async function handleVideoSpeed() {   
    await syncVideoSpeedPreference(); // Sync speed preference
    
    // Check if we should apply speed to current page
    const speedEnabled = localStorage.getItem('ycs-speed-enabled') === 'true';
    if (!speedEnabled) {
        videoSpeedLog('Video speed feature is disabled, not injecting script');
        return;
    }
    
    // Check if current page is a shorts page
    const isShorts = window.location.pathname.startsWith('/shorts');
    
    // Check if we should apply to shorts
    const applyToShorts = localStorage.getItem('ycs-speed-apply-to-shorts') !== 'false';
    
    // Skip injection if this is a shorts page and we shouldn't apply speed to shorts
    if (isShorts && !applyToShorts) {
        videoSpeedLog('Not applying speed to shorts (disabled in settings)');
        return;
    }
    
    // If we get here, we need to inject the script
    //videoSpeedLog('Injecting speed script');
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
        localStorage.setItem('ycs-speed-enabled', JSON.stringify(message.enabled));
        localStorage.setItem('ycs-speed-value', message.speed.toString());
        
        // Store the "apply to shorts" preference if it exists
        if ('applyToShorts' in message && typeof message.applyToShorts === 'boolean') {
            localStorage.setItem('ycs-speed-apply-to-shorts', JSON.stringify(message.applyToShorts));
        }
        
        // Reapply speed if a video is currently playing
        handleVideoSpeed();
    }
    return true;
});