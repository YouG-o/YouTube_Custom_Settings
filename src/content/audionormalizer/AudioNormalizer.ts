/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { audioNormalizerLog, audioNormalizerErrorLog } from "../../utils/logger";


async function syncAudioNormalizerPreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.audioNormalizer) {
            // Read current YCS_SETTINGS object
            const raw = localStorage.getItem('YCS_SETTINGS');
            const ycsSettings = raw ? JSON.parse(raw) : {};
            
            // Update only audioNormalizer property
            ycsSettings.audioNormalizer = settings.audioNormalizer;
            
            // Write back
            localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
            
            audioNormalizerLog(`Synced audio normalizer preference from extension storage: ${settings.audioNormalizer.value}, manual: ${settings.audioNormalizer.manualActivation}`);
        }
    } catch (error) {
        audioNormalizerErrorLog('Error syncing audio normalizer preference:', error);
    }
}

// Call this function during initialization
export async function handleAudioNormalizer() {   
    await syncAudioNormalizerPreference();
    
    // Read from YCS_SETTINGS
    const raw = localStorage.getItem('YCS_SETTINGS');
    const ycsSettings = raw ? JSON.parse(raw) : {};
    const normalizerEnabled = ycsSettings.audioNormalizer?.enabled === true;
    
    if (!normalizerEnabled) {
        audioNormalizerLog('Audio normalizer feature is disabled, not injecting script');
        return;
    }
    
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/AudioNormalizerScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle audio normalizer settings changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'audioNormalizer') {
        
        // Read current YCS_SETTINGS object
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        
        // Ensure audioNormalizer object exists
        if (!ycsSettings.audioNormalizer) {
            ycsSettings.audioNormalizer = {};
        }
        
        if ('enabled' in message && typeof message.enabled === 'boolean') {
            audioNormalizerLog(`Setting audio normalizer preference: enabled=${message.enabled}`);
            ycsSettings.audioNormalizer.enabled = message.enabled;
        }
        
        if ('value' in message && typeof message.value === 'string') {
            ycsSettings.audioNormalizer.value = message.value;
        }
        
        if ('manualActivation' in message && typeof message.manualActivation === 'boolean') {
            ycsSettings.audioNormalizer.manualActivation = message.manualActivation;
            ycsSettings.audioNormalizer.active = false;
        }
        
        if ('toggleState' in message && typeof message.toggleState === 'boolean') {
            ycsSettings.audioNormalizer.active = message.toggleState;
            
            window.postMessage({
                type: 'YCS_AUDIO_NORMALIZER_UPDATE',
                toggleState: message.toggleState
            }, '*');
        }
        
        // Write back
        localStorage.setItem('YCS_SETTINGS', JSON.stringify(ycsSettings));
        
        handleAudioNormalizer();
    }
    return true;
});