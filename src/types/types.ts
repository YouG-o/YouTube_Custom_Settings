/**
 * Type definitions for the extension
 */

interface FeatureSetting<T> {
    enabled: boolean;
    value: T;
}

interface SpeedSetting extends FeatureSetting<number> {
    applyToShorts: boolean;
}

interface AudioNormalizerSetting extends FeatureSetting<string> {
    manualActivation: boolean;
    customSettings?: {
        threshold: number;
        boost: number;
        ratio: number;
        attack: number;
        release: number;
    };
}

interface ExtensionSettings {
    videoQuality: FeatureSetting<string>;
    videoSpeed: SpeedSetting;
    subtitlesPreference: FeatureSetting<string>;
    audioNormalizer: AudioNormalizerSetting;
}

interface Message {
    action: string;
    settings: ExtensionSettings;
}