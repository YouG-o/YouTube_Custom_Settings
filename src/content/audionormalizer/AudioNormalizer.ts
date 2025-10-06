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
            localStorage.setItem('ycs-audio-normalizer-enabled', JSON.stringify(settings.audioNormalizer.enabled));
            localStorage.setItem('ycs-audio-normalizer-value', settings.audioNormalizer.value);
            localStorage.setItem('ycs-audio-normalizer-manual', JSON.stringify(settings.audioNormalizer.manualActivation));
            
            // Store custom settings if present
            if (settings.audioNormalizer.customSettings) {
                localStorage.setItem('ycs-custom-threshold', settings.audioNormalizer.customSettings.threshold.toString());
                localStorage.setItem('ycs-custom-boost', settings.audioNormalizer.customSettings.boost.toString());
                localStorage.setItem('ycs-custom-ratio', settings.audioNormalizer.customSettings.ratio.toString());
                localStorage.setItem('ycs-custom-attack', settings.audioNormalizer.customSettings.attack.toString());
                localStorage.setItem('ycs-custom-release', settings.audioNormalizer.customSettings.release.toString());
            }
            
            // Reset active state to false ONLY when manual activation is enabled AND not in custom mode
            // This fixes the issue where custom settings are lost when opening popup
            if (settings.audioNormalizer.manualActivation && settings.audioNormalizer.value !== 'custom') {
                localStorage.setItem('ycs-audio-normalizer-active', 'false');
            }
            
            audioNormalizerLog(`Synced audio normalizer preference from extension storage: ${settings.audioNormalizer.value}, manual: ${settings.audioNormalizer.manualActivation}`);
        }
    } catch (error) {
        audioNormalizerErrorLog('Error syncing audio normalizer preference:', error);
    }
}

// Call this function during initialization
export async function handleAudioNormalizer() {   
    await syncAudioNormalizerPreference(); // Sync audio normalizer preference
    
    // Check if we should apply normalization to current page
    const normalizerEnabled = localStorage.getItem('ycs-audio-normalizer-enabled') === 'true';
    if (!normalizerEnabled) {
        audioNormalizerLog('Audio normalizer feature is disabled, not injecting script');
        return;
    }
    
    // If we get here, we need to inject the script
    //audioNormalizerLog('Injecting audio normalizer script');
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/AudioNormalizerScript.js');
    document.documentElement.appendChild(script);
}

// Function to handle audio normalizer settings changes
browser.runtime.onMessage.addListener((message: unknown) => {
    if (typeof message === 'object' && message !== null &&
        'feature' in message && message.feature === 'audioNormalizer') {
        
        if ('enabled' in message && typeof message.enabled === 'boolean') {
            // Store preference
            audioNormalizerLog(`Setting audio normalizer preference: enabled=${message.enabled}`);
            localStorage.setItem('ycs-audio-normalizer-enabled', JSON.stringify(message.enabled));
        }
        
        // Handle value if provided
        if ('value' in message && typeof message.value === 'string') {
            localStorage.setItem('ycs-audio-normalizer-value', message.value);
        }
        
        // Handle manual activation preference if provided
        if ('manualActivation' in message && typeof message.manualActivation === 'boolean') {
            localStorage.setItem('ycs-audio-normalizer-manual', JSON.stringify(message.manualActivation));
            
            // Reset active state when changing manual activation setting
            localStorage.setItem('ycs-audio-normalizer-active', 'false');
        }
        
        // Handle toggle state if provided (used when button is clicked in player)
        if ('toggleState' in message && typeof message.toggleState === 'boolean') {
            localStorage.setItem('ycs-audio-normalizer-active', JSON.stringify(message.toggleState));
            
            // Send message to page script to update state immediately
            window.postMessage({
                type: 'ycs_AUDIO_NORMALIZER_UPDATE',
                toggleState: message.toggleState
            }, '*');
        }
        
        // Reapply normalization if a video is currently playing
        handleAudioNormalizer();
    }
    return true;
});