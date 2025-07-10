/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from '../types/types';
import { loadExtensionSettings } from '../utils/settings';


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

const audioNormalizerFeature = document.getElementById('audioNormalizerFeature') as HTMLInputElement;
const audioNormalizerSelect = document.getElementById('audioNormalizerValue') as HTMLSelectElement;
const audioNormalizerManual = document.getElementById('audioNormalizerManual') as HTMLInputElement;
const audioNormalizerContainer = document.getElementById('audioNormalizerContainer') as HTMLDivElement;

// Custom settings
const audioNormalizerCustomContainer = document.getElementById('audioNormalizerCustomContainer') as HTMLDivElement;
const customThreshold = document.getElementById('customThreshold') as HTMLInputElement;
const customBoost = document.getElementById('customBoost') as HTMLInputElement;
const customRatio = document.getElementById('customRatio') as HTMLInputElement;
const customAttack = document.getElementById('customAttack') as HTMLInputElement;
const customRelease = document.getElementById('customRelease') as HTMLInputElement;
const applyShortsSpeed = document.getElementById('applyShortsSpeed') as HTMLInputElement;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement; // Add this line

// Function to display the extension version
function displayExtensionVersion() {
    if (extensionVersionElement) {
        const manifest = browser.runtime.getManifest();
        extensionVersionElement.textContent = manifest.version;
    }
}

// Load saved settings from storage
async function loadSettings() {
    try {
        const settings = await loadExtensionSettings();
        
        // Apply saved settings to UI
        videoQualityFeature.checked = settings.videoQuality.enabled;
        videoQualitySelect.value = settings.videoQuality.value;
        toggleContainer(videoQualityContainer, videoQualityFeature.checked);
        
        videoSpeedFeature.checked = settings.videoSpeed.enabled;
        videoSpeedSelect.value = String(settings.videoSpeed.value);
        toggleContainer(videoSpeedContainer, videoSpeedFeature.checked);
        applyShortsSpeed.checked = settings.videoSpeed.applyToShorts !== false;
        
        subtitlesToggle.checked = settings.subtitlesPreference.enabled;
        subtitlesPreferenceSelect.value = settings.subtitlesPreference.value;
        toggleContainer(subtitlesPreferenceContainer, subtitlesToggle.checked);
        
        // Audio normalizer settings
        if (settings.audioNormalizer) {
            audioNormalizerFeature.checked = settings.audioNormalizer.enabled;
            // Set dropdown value directly from loaded settings
            audioNormalizerSelect.value = settings.audioNormalizer.value; 
            audioNormalizerManual.checked = settings.audioNormalizer.manualActivation || false;
            
            // Toggle visibility based on the loaded state
            toggleContainer(audioNormalizerContainer, audioNormalizerFeature.checked);
            // Show custom container ONLY if the loaded value is 'custom'
            toggleContainer(audioNormalizerCustomContainer, audioNormalizerSelect.value === 'custom'); 
            
            // Load custom input values if the mode is 'custom' AND custom settings exist
            if (audioNormalizerSelect.value === 'custom' && settings.audioNormalizer.customSettings) {
                customThreshold.value = settings.audioNormalizer.customSettings.threshold.toString();
                customBoost.value = settings.audioNormalizer.customSettings.boost.toString();
                customRatio.value = settings.audioNormalizer.customSettings.ratio.toString();
                customAttack.value = settings.audioNormalizer.customSettings.attack.toString();
                customRelease.value = settings.audioNormalizer.customSettings.release.toString();
            }
        }
    } catch (error) {
        // Log error if loading settings fails
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
        },
        audioNormalizer: {
            enabled: audioNormalizerFeature.checked,
            value: audioNormalizerSelect.value,
            manualActivation: audioNormalizerManual.checked,
            // Add custom settings if using custom intensity
            customSettings: audioNormalizerSelect.value === 'custom' ? {
                threshold: parseFloat(customThreshold.value),
                boost: parseFloat(customBoost.value),
                ratio: parseFloat(customRatio.value),
                attack: parseFloat(customAttack.value),
                release: parseFloat(customRelease.value)
            } : undefined
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
            // Send special message for custom settings ONLY if custom mode is selected
            if (settings.audioNormalizer.value === 'custom' && settings.audioNormalizer.customSettings) {
                await browser.tabs.sendMessage(tab.id, {
                    feature: 'audioNormalizer',
                    enabled: settings.audioNormalizer.enabled,
                    value: settings.audioNormalizer.value,
                    manualActivation: settings.audioNormalizer.manualActivation,
                    customSettings: settings.audioNormalizer.customSettings
                }).catch(error => {
                    console.error(`Failed to update audio normalizer settings for tab ${tab.id}:`, error);
                });
                
                // Important: Wait for a moment to ensure the first message is processed
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Then update all other settings
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
    
    audioNormalizerFeature.addEventListener('change', () => {
        toggleContainer(audioNormalizerContainer, audioNormalizerFeature.checked);
        saveSettings();
    });
    
    // Value changes
    videoQualitySelect.addEventListener('change', saveSettings);
    videoSpeedSelect.addEventListener('change', saveSettings);
    subtitlesPreferenceSelect.addEventListener('change', saveSettings);
    audioNormalizerSelect.addEventListener('change', saveSettings);
    
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
    
    // Manual activation toggle
    audioNormalizerManual.addEventListener('change', saveSettings);
    
    // Fix for the Audio Normalizer Manual toggle - Add click handler to the parent div
    const audioNormalizerManualParent = audioNormalizerManual.parentElement;
    if (audioNormalizerManualParent) {
        audioNormalizerManualParent.addEventListener('click', (e) => {
            // Toggle the checkbox state
            audioNormalizerManual.checked = !audioNormalizerManual.checked;
            // Trigger a change event to run event handlers
            audioNormalizerManual.dispatchEvent(new Event('change'));
        });
    }
    
    // Show/hide custom settings when intensity changes
    audioNormalizerSelect.addEventListener('change', () => {
        toggleContainer(audioNormalizerCustomContainer, audioNormalizerSelect.value === 'custom');
        saveSettings();
    });
    
    // Add change listeners for all custom settings
    customThreshold.addEventListener('change', saveSettings);
    customBoost.addEventListener('change', saveSettings);
    customRatio.addEventListener('change', saveSettings);
    customAttack.addEventListener('change', saveSettings);
    customRelease.addEventListener('change', saveSettings);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    displayExtensionVersion();
    loadSettings();
    initEventListeners();
});


// Adjust tooltip positions if they overflow the viewport
const tooltipGroups = document.querySelectorAll('.tooltip') as NodeListOf<HTMLDivElement>;

tooltipGroups.forEach((group) => {
    const bodyWidth = document.body.clientWidth;  
    const tooltip = group.querySelector('span') as HTMLSpanElement;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    if (tooltipRect.right > bodyWidth) {
        tooltip.style.marginLeft = `-${tooltipRect.right - bodyWidth + 20}px`;
    }
});