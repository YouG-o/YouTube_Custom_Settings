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

const volumeFeature = document.getElementById('volumeFeature') as HTMLInputElement;
const volumeValue = document.getElementById('volumeValue') as HTMLInputElement;
const volumeContainer = document.getElementById('volumeContainer') as HTMLDivElement;

// Custom settings
const audioNormalizerCustomContainer = document.getElementById('audioNormalizerCustomContainer') as HTMLDivElement;
const customThreshold = document.getElementById('customThreshold') as HTMLInputElement;
const customBoost = document.getElementById('customBoost') as HTMLInputElement;
const customRatio = document.getElementById('customRatio') as HTMLInputElement;
const customAttack = document.getElementById('customAttack') as HTMLInputElement;
const customRelease = document.getElementById('customRelease') as HTMLInputElement;
const applyShortsSpeed = document.getElementById('applyShortsSpeed') as HTMLInputElement;
const extensionVersionElement = document.getElementById('extensionVersion') as HTMLSpanElement; // Add this line

const hideMembersOnlyVideosFeature = document.getElementById('hideMembersOnlyVideosFeature') as HTMLInputElement;

const audioTrackFeature = document.getElementById('audioTrackFeature') as HTMLInputElement;
const audioTrackLanguageSelect = document.getElementById('audioTrackLanguage') as HTMLSelectElement;
const audioTrackContainer = document.getElementById('audioTrackContainer') as HTMLDivElement;

const durationRuleEnabled = document.getElementById('durationRuleEnabled') as HTMLInputElement;
const durationRuleType = document.getElementById('durationRuleType') as HTMLSelectElement;
const durationRuleMinutes = document.getElementById('durationRuleMinutes') as HTMLInputElement;

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

        // Volume settings
        if (settings.volume) {
            volumeFeature.checked = settings.volume.enabled;
            volumeValue.value = String(settings.volume.value);
            toggleContainer(volumeContainer, volumeFeature.checked);
        }

        // Hide Members Only Videos setting
        if (settings.hideMembersOnlyVideos) {
            hideMembersOnlyVideosFeature.checked = settings.hideMembersOnlyVideos.enabled;
        }

        // Audio track settings
        if (settings.audioTrack) {
            audioTrackFeature.checked = settings.audioTrack.enabled;
            audioTrackLanguageSelect.value = settings.audioTrack.language;
            toggleContainer(audioTrackContainer, audioTrackFeature.checked);
        }

        // Duration rule settings
        durationRuleEnabled.checked = settings.videoSpeed.durationRuleEnabled ?? false;
        durationRuleType.value = settings.videoSpeed.durationRuleType ?? 'less';
        durationRuleMinutes.value = String(settings.videoSpeed.durationRuleMinutes ?? 5);
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
            applyToShorts: applyShortsSpeed.checked,
            durationRuleEnabled: durationRuleEnabled.checked,
            durationRuleType: durationRuleType.value as 'greater' | 'less',
            durationRuleMinutes: parseInt(durationRuleMinutes.value, 10)
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
        },
        volume: {
            enabled: volumeFeature.checked,
            value: parseFloat(volumeValue.value)
        },
        hideMembersOnlyVideos: {
            enabled: hideMembersOnlyVideosFeature.checked
        },
        audioTrack: {
            enabled: audioTrackFeature.checked,
            language: audioTrackLanguageSelect.value
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
            // Only send the audioNormalizer message if enabled and custom
            if (
                settings.audioNormalizer.enabled &&
                settings.audioNormalizer.value === 'custom' &&
                settings.audioNormalizer.customSettings
            ) {
                await browser.tabs.sendMessage(tab.id, {
                    feature: 'audioNormalizer',
                    enabled: settings.audioNormalizer.enabled,
                    value: settings.audioNormalizer.value,
                    manualActivation: settings.audioNormalizer.manualActivation,
                    customSettings: settings.audioNormalizer.customSettings
                });
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Always send the global settings update
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
    
    volumeFeature.addEventListener('change', () => {
        toggleContainer(volumeContainer, volumeFeature.checked);
        saveSettings();
    });

    audioTrackFeature.addEventListener('change', () => {
        toggleContainer(audioTrackContainer, audioTrackFeature.checked);
        saveSettings();
    });

    durationRuleEnabled.addEventListener('change', saveSettings);
    durationRuleType.addEventListener('change', saveSettings);
    durationRuleMinutes.addEventListener('change', saveSettings);

    // Value changes
    videoQualitySelect.addEventListener('change', saveSettings);
    videoSpeedSelect.addEventListener('change', saveSettings);
    subtitlesPreferenceSelect.addEventListener('change', saveSettings);
    audioNormalizerSelect.addEventListener('change', saveSettings);
    volumeValue.addEventListener('change', saveSettings);
    audioTrackLanguageSelect.addEventListener('change', saveSettings);

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

    // Hide Members Only Videos feature
    hideMembersOnlyVideosFeature.addEventListener('change', saveSettings);
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

// Check if this is a welcome page (first install)
const urlParams = new URLSearchParams(window.location.search);
const isWelcome = urlParams.get('welcome') === 'true';

if (isWelcome) {
    const pageTitle = document.getElementById('pageTitle');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (pageTitle) {
        // Keep the image and change only the text part
        const imgElement = pageTitle.querySelector('img');
        if (imgElement) {
            pageTitle.innerHTML = '';
            pageTitle.appendChild(imgElement);
            pageTitle.appendChild(document.createTextNode('Welcome to YouTube No Translation!'));
            pageTitle.className = 'text-2xl font-semibold text-white flex items-center gap-2 mb-2';
        }
    }
    
    if (welcomeMessage) {
        welcomeMessage.classList.remove('hidden');
    }
}

// Handle reload of all YouTube tabs from the welcome page
if (isWelcome) {
    const reloadBtn = document.getElementById('reloadYoutubeTabsBtn') as HTMLButtonElement | null;
    if (reloadBtn) {
        reloadBtn.onclick = async () => {
            try {
                const tabs = await browser.tabs.query({
                    url: [
                        "*://*.youtube.com/*",
                        "*://*.youtube-nocookie.com/*"
                    ]
                });
                let count = 0;
                for (const tab of tabs) {
                    // Only reload tabs that are not discarded
                    if (tab.id && tab.discarded === false) {
                        await browser.tabs.reload(tab.id);
                        count++;
                    }
                }
                reloadBtn.textContent = `Reloaded ${count} active tab${count !== 1 ? 's' : ''}!`;
                reloadBtn.disabled = true;
            } catch (error) {
                reloadBtn.textContent = "Error reloading tabs";
                reloadBtn.disabled = true;
                console.error("[YDS] Failed to reload YouTube tabs:", error);
            }
        };
    }
}