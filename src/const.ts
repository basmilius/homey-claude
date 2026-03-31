export const SETTING_API_KEY = 'claude-api-key';
export const SETTING_CUSTOM_INSTRUCTIONS = 'claude-custom-instructions';
export const SETTING_DEFAULT_MODEL = 'claude-default-model';
export const SETTING_DEFAULT_SYSTEM_PROMPT = 'claude-default-system-prompt';
export const SETTING_MAX_TOKENS = 'claude-max-tokens';
export const SETTING_SCHEDULED_COMMANDS = 'claude-scheduled-commands';

export const SETTING_HOMEY_MCP_CLIENT_ID = 'homey-mcp-client-id';
export const SETTING_HOMEY_MCP_CLIENT_SECRET = 'homey-mcp-client-secret';
export const SETTING_HOMEY_MCP_ACCESS_TOKEN = 'homey-mcp-access-token';
export const SETTING_HOMEY_MCP_REFRESH_TOKEN = 'homey-mcp-refresh-token';
export const SETTING_HOMEY_MCP_TOKEN_EXPIRES_AT = 'homey-mcp-token-expires-at';

export const HOMEY_MCP_SERVER_URL = 'https://mcp.athom.com';
export const HOMEY_MCP_AUTH_ENDPOINT = 'https://mcp.athom.com/oauth2/authorise';
export const HOMEY_MCP_TOKEN_ENDPOINT = 'https://mcp.athom.com/oauth2/token';
export const HOMEY_MCP_REGISTER_ENDPOINT = 'https://mcp.athom.com/oauth2/client';

export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const DEFAULT_MAX_TOKENS = 1024;

export const MODELS = [
    {id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5'},
    {id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6'},
    {id: 'claude-opus-4-6', name: 'Claude Opus 4.6'}
] as const;
