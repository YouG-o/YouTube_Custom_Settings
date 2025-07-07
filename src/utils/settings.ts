/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from '../types/types';
import { DEFAULT_SETTINGS } from '../config/constants';
import { migrateSettings } from './utils';


/**
 * Load extension settings from storage with fallback to defaults
 * @returns Promise<ExtensionSettings> - The loaded or default settings
 */
export async function loadExtensionSettings(): Promise<ExtensionSettings> {
    try {
        const data = await browser.storage.local.get('settings');
        
        // If no settings, return defaults
        if (!data.settings) {
            return DEFAULT_SETTINGS;
        }
        
        // Migrate settings to ensure all required properties exist
        return migrateSettings(data.settings, DEFAULT_SETTINGS) as ExtensionSettings;
    } catch (error) {
        console.error('Failed to load extension settings, using defaults:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save extension settings to storage
 * @param settings - The settings to save
 */
export async function saveExtensionSettings(settings: ExtensionSettings): Promise<void> {
    try {
        await browser.storage.local.set({ settings });
    } catch (error) {
        console.error('Failed to save extension settings:', error);
        throw error;
    }
}