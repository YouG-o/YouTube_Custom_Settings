// Default settings as a constant
const DEFAULT_SETTINGS: ExtensionSettings = {
    videoQuality: {
        enabled: false,
        value: 'auto'
    },
    videoSpeed: {
        enabled: false,
        value: 1,
        applyToShorts: true
    },
    subtitlesPreference: {
        enabled: false,
        value: 'original'
    },
    audioNormalizer: {
        enabled: false,
        value: 'medium',
        manualActivation: false // Default to manual activation for better user experience
    }
};

// Define the type for installation details
interface InstalledDetails {
    reason: 'install' | 'update' | 'browser_update' | 'chrome_update';
    previousVersion?: string;
    id?: string;
}