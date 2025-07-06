/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

export interface FeatureSetting<T> {
    enabled: boolean;
    value: T;
}

export interface SpeedSetting extends FeatureSetting<number> {
    applyToShorts: boolean;
}

export interface AudioNormalizerSetting extends FeatureSetting<string> {
    manualActivation: boolean;
    customSettings?: {
        threshold: number;
        boost: number;
        ratio: number;
        attack: number;
        release: number;
    };
}

export interface ExtensionSettings {
    videoQuality: FeatureSetting<string>;
    videoSpeed: SpeedSetting;
    subtitlesPreference: FeatureSetting<string>;
    audioNormalizer: AudioNormalizerSetting;
}

export interface Message {
    action: string;
    settings: ExtensionSettings;
}