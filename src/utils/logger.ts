/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

const LOG_PREFIX = '[YCS]';

const LOG_STYLES = {
    CORE: {
        context: '[Core]',
        color: '#c084fc'  // light purple
    },
    VIDEO_QUALITY: {
        context: '[Video Quality]',
        color: '#fcd34d'  // yellow
    },
    VIDEO_SPEED: {
        context: '[Video Speed]',
        color: '#fca5a5'  // light red
    },
    SUBTITLES: {
        context: '[Subtitles]',
        color: '#FF9800'  // orange
    },
    AUDIO_NORMALIZER: {
        context: '[Audio Normalizer]',
        color: '#4ade80'  // green
    },
    VOLUME: {
        context: '[Volume]',
        color: '#60a5fa'  // light blue
    },
    MEMBER_VIDEOS: {
        context: '[Member Videos]',
        color: '#8b5cf6'  // indigo
    },
    AUDIO_TRACK: {
        context: '[Audio Track]',
        color: '#4CAF50'  // Green
    }
} as const;

// Error color for all error logs
const ERROR_COLOR = '#F44336';  // Red

function createLogger(category: { context: string; color: string }) {
    return (message: string, ...args: any[]) => {
        console.log(
            `%c${LOG_PREFIX}${category.context} ${message}`,
            `color: ${category.color}`,
            ...args
        );
    };
}

// Create error logger function
function createErrorLogger(category: { context: string; color: string }) {
    return (message: string, ...args: any[]) => {
        console.log(
            `%c${LOG_PREFIX}${category.context} %c${message}`,
            `color: ${category.color}`,  // Keep category color for prefix
            `color: ${ERROR_COLOR}`,     // Red color for error message
            ...args
        );
    };
}

// Create standard loggers
export const coreLog = createLogger(LOG_STYLES.CORE);
export const coreErrorLog = createErrorLogger(LOG_STYLES.CORE);

export const videoQualityLog = createLogger(LOG_STYLES.VIDEO_QUALITY);
export const videoQualityErrorLog = createErrorLogger(LOG_STYLES.VIDEO_QUALITY);

export const videoSpeedLog = createLogger(LOG_STYLES.VIDEO_SPEED);
export const videoSpeedErrorLog = createErrorLogger(LOG_STYLES.VIDEO_SPEED);

export const subtitlesLog = createLogger(LOG_STYLES.SUBTITLES);
export const subtitlesErrorLog = createErrorLogger(LOG_STYLES.SUBTITLES);

export const audioNormalizerLog = createLogger(LOG_STYLES.AUDIO_NORMALIZER);
export const audioNormalizerErrorLog = createErrorLogger(LOG_STYLES.AUDIO_NORMALIZER);

export const volumeLog = createLogger(LOG_STYLES.VOLUME);
export const volumeErrorLog = createErrorLogger(LOG_STYLES.VOLUME);

export const memberVideosLog = createLogger(LOG_STYLES.MEMBER_VIDEOS);
export const memberVideosErrorLog = createErrorLogger(LOG_STYLES.MEMBER_VIDEOS);

export const audioTrackLog = createLogger(LOG_STYLES.AUDIO_TRACK);
export const audioTrackErrorLog = createErrorLogger(LOG_STYLES.AUDIO_TRACK);