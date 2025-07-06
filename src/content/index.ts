/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { coreLog } from '../utils/logger';
import { migrateSettings } from '../utils/utils';
import { ExtensionSettings, Message } from '../types/types';
import { handleVideoSpeed } from './videospeed/VideoSpeed';
import { handleVideoQuality } from './videoquality/VideoQuality';
import { handleSubtitlesPreference } from './subtitles/SubtitlesPreference';
import { handleAudioNormalizer } from './audionormalizer/AudioNormalizer';
import { setupVideoPlayerListener } from './observers';


coreLog('Content script starting to load...');

export let currentSettings: ExtensionSettings | null = null;

// Fetch settings once and store them in currentSettings
async function fetchSettings() {
    const data = await browser.storage.local.get('settings');
    
    // Complete default settings
    const defaultSettings = {
        videoQuality: { enabled: false, value: 'auto' },
        videoSpeed: { enabled: false, value: 1, applyToShorts: true },
        subtitlesPreference: { enabled: false, value: 'original' },
        audioNormalizer: { enabled: false, value: 'medium', manualActivation: false }
    };
    
    // If no settings, use defaults
    if (!data.settings) {
        currentSettings = defaultSettings as ExtensionSettings;
        return;
    }
    
    // Migrate settings: ensure all required properties exist
    const settings = migrateSettings(data.settings, defaultSettings);
    
    currentSettings = settings as ExtensionSettings;
}

// Initialize features based on settings
async function initializeFeatures() {
    await fetchSettings();
    
    // Apply settings
    applyStoredSettings();

    initializeVideoPlayerListener();
}

// Initialize functions
let videoPlayerListenerInitialized = false;

function initializeVideoPlayerListener() {
    if (!videoPlayerListenerInitialized && (
        currentSettings?.videoQuality.enabled || 
        currentSettings?.videoSpeed.enabled || 
        currentSettings?.subtitlesPreference.enabled ||
        currentSettings?.audioNormalizer.enabled
    )) {
        setupVideoPlayerListener();
        videoPlayerListenerInitialized = true;
    }
}

// Apply settings by sending them to the injected script
function applyStoredSettings() {
    if (!currentSettings) return;
    
    window.postMessage({
        type: 'YDS_SETTINGS_UPDATE',
        settings: currentSettings
    }, '*');
    
    // Apply settings immediately to current video if it's playing
    if (currentSettings.videoQuality.enabled) {
        handleVideoQuality();
    }
    
    if (currentSettings.videoSpeed.enabled) {
        handleVideoSpeed();
    }
    
    if (currentSettings.subtitlesPreference.enabled) {
        handleSubtitlesPreference();
    }

    if (currentSettings.audioNormalizer.enabled) {
        handleAudioNormalizer();
    }
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