/* 
* Copyright (C) 2025-present YouGo (https://github.com/youg-o)
* This program is licensed under the GNU Affero General Public License v3.0.
* You may redistribute it and/or modify it under the terms of the license.
* 
* Attribution must be given to the original author.
* This program is distributed without any warranty; see the license for details.
*/

/**
 * Handles YouTube's audio track selection to force preferred language.
 * Uses base64 decoding to identify tracks, ensuring independence from UI language.
 */

import { audioTrackLog, audioTrackErrorLog } from '../../utils/logger';
import { YouTubePlayer, YouTubeAudioTrack } from '../../types/types';

let retryCount = 0;
const MAX_RETRIES = 5;

/**
 * Sets the preferred audio track based on user preference.
 * @returns {boolean} True if the track was set or already correct, false otherwise.
 */
function setPreferredTrack(): boolean {
    let targetId = 'movie_player';
    if (window.location.pathname.startsWith('/shorts')) {
        targetId = 'shorts-player';
    } else if (window.location.pathname.startsWith('/@')) {
        targetId = 'c4-player';
    }
    const player = document.getElementById(targetId) as YouTubePlayer | null;
    if (!player || typeof player.getAvailableAudioTracks !== 'function') return false;

    try {
        // Read from YCS_SETTINGS
        const raw = localStorage.getItem('YCS_SETTINGS');
        const ycsSettings = raw ? JSON.parse(raw) : {};
        const audioLanguage = ycsSettings.audioTrack?.language || 'original';
        
        const tracks = player.getAvailableAudioTracks();

        if (!Array.isArray(tracks) || tracks.length <= 1) {
            audioTrackLog('Only one audio track available, no change needed');
            return true;
        }

        const currentTrack = player.getAudioTrack();

        if (currentTrack) {
            const base64Part = currentTrack.id.split(';')[1];
            const decoded = atob(base64Part);

            if (audioLanguage === 'original') {
                if (decoded.includes('original')) {
                    audioTrackLog('Audio track is already original');
                    return true;
                }
            } else {
                const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                const trackLangCode = langMatch ? langMatch[1].split('-')[0] : null;
                if (trackLangCode === audioLanguage) {
                    audioTrackLog('Audio already in preferred language');
                    return true;
                }
            }
        }

        if (audioLanguage === 'original') {
            const originalTrack = tracks.find(track => {
                const base64Part = track.id.split(';')[1];
                const decoded = atob(base64Part);
                return decoded.includes('original');
            });

            if (originalTrack) {
                const base64Part = originalTrack.id.split(';')[1];
                const decoded = atob(base64Part);
                const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                const langCode = langMatch ? langMatch[1].split('-')[0] : 'unknown';
                audioTrackLog('Setting audio to original language: ' + langCode);
                player.setAudioTrack(originalTrack);
                return true;
            }
        } else {
            const preferredTrack = tracks.find(track => {
                const base64Part = track.id.split(';')[1];
                const decoded = atob(base64Part);
                const langMatch = decoded.match(/lang..([-a-zA-Z]+)/);
                if (!langMatch) return false;
                const trackLangCode = langMatch[1].split('-')[0];
                return trackLangCode === audioLanguage;
            });

            if (preferredTrack) {
                audioTrackLog('Setting audio to preferred language: ' + audioLanguage);
                player.setAudioTrack(preferredTrack);
                return true;
            }
            audioTrackLog(`Selected language "${audioLanguage}" not available`);
        }

        return false;
    } catch (error: any) {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = 50 * retryCount;
            setTimeout(() => {
                setPreferredTrack();
            }, delay);
        } else {
            retryCount = 0;
        }
        return false;
    }
}

// Initial call
setPreferredTrack();