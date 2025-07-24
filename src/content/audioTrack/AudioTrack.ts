/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { ExtensionSettings } from "../../types/types";
import { audioTrackLog, audioTrackErrorLog } from '../../utils/logger';


async function syncAudioLanguagePreference() {
    try {
        const result = await browser.storage.local.get('settings');
        const settings = result.settings as ExtensionSettings;
        
        if (settings?.audioTrack?.language) {
            localStorage.setItem('yds-audioLanguage', settings.audioTrack.language);
        }
    } catch (error) {
        audioTrackErrorLog('Error syncing audio language preference:', error);
    }
}

export async function handleAudioTrack() {   
    await syncAudioLanguagePreference();
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/scripts/AudioTrackScript.js');
    document.documentElement.appendChild(script);
}