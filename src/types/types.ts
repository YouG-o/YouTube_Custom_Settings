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

interface ExtensionSettings {
    videoQuality: FeatureSetting<string>;
    videoSpeed: SpeedSetting;
    subtitlesPreference: FeatureSetting<string>;
}

interface Message {
    action: string;
    settings: ExtensionSettings;
}