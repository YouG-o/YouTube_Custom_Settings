/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

import { shortsLog, shortsErrorLog } from '../../utils/logger';

let currentVideoElement: HTMLVideoElement | null = null;
let loopObserver: MutationObserver | null = null;

/**
 * Setup loop prevention on the current Shorts video
 */
function setupLoopPrevention(): void {
    try {
        // Only apply to Shorts pages
        if (!window.location.pathname.startsWith('/shorts/')) {
            shortsLog('Not a Shorts page, skipping loop prevention');
            return;
        }

        // Find the Shorts video element with multiple selectors
        const selectors = [
            '#shorts-player video',
            'ytd-reel-video-renderer video',
            '.html5-video-player video'
        ];
        
        let videoElement: HTMLVideoElement | null = null;
        for (const selector of selectors) {
            videoElement = document.querySelector(selector) as HTMLVideoElement;
            if (videoElement) {
                //shortsLog(`Found video element with selector: ${selector}`);
                break;
            }
        }
        
        if (!videoElement) {
            shortsLog('Video element not found, will retry...');
            setTimeout(setupLoopPrevention, 500);
            return;
        }

        // Skip if already attached to this element
        if (currentVideoElement === videoElement) {
            shortsLog('Loop prevention already attached to this video element');
            return;
        }

        // Cleanup previous listeners if switching videos
        cleanupLoopPrevention();

        // Disable loop attribute
        if (videoElement.hasAttribute('loop')) {
            videoElement.removeAttribute('loop');
            shortsLog('Removed loop attribute from video');
        }
        if (videoElement.loop) {
            videoElement.loop = false;
            shortsLog('Set loop property to false');
        }
        
        // MutationObserver to prevent YouTube from re-enabling loop
        loopObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'loop') {
                    if (videoElement && videoElement.hasAttribute('loop')) {
                        videoElement.removeAttribute('loop');
                        videoElement.loop = false;
                        shortsLog('Loop attribute re-enabled by YouTube, removed again');
                    }
                }
            }
        });
        
        loopObserver.observe(videoElement, {
            attributes: true,
            attributeFilter: ['loop']
        });

        currentVideoElement = videoElement;
        
        shortsLog('Shorts loop prevention enabled');
    } catch (error) {
        shortsErrorLog('Error setting up Shorts loop prevention:', error);
    }
}

/**
 * Remove loop prevention listeners and observers
 */
export function cleanupLoopPrevention(): void {
    if (loopObserver) {
        loopObserver.disconnect();
        loopObserver = null;
        //shortsLog('Disconnected loop observer');
    }
    
    if (currentVideoElement) {
        currentVideoElement = null;
    }
}

/**
 * Handle Shorts loop prevention (called by observers.ts)
 */
export function handleShortsLoopPrevention(): void {
    setupLoopPrevention();
}