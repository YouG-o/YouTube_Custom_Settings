/**
 * Type definitions for the extension
 */

interface FeatureSetting<T> {
    enabled: boolean;
    value: T;
}

interface ExtensionSettings {
    videoQuality: FeatureSetting<string>;
    videoSpeed: FeatureSetting<number>;
}

interface Message {
    action: string;
    settings: ExtensionSettings;
}