export const SETTING_API_KEY = 'claude-api-key';
export const SETTING_DEFAULT_MODEL = 'claude-default-model';
export const SETTING_MAX_TOKENS = 'claude-max-tokens';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const DEFAULT_MAX_TOKENS = 1024;

export const MODELS = [
    {id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5'},
    {id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6'},
    {id: 'claude-opus-4-6', name: 'Claude Opus 4.6'}
] as const;
