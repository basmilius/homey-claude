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

export const MAX_SERVER_TOOL_TURNS = 8;
export const MAX_WEB_CONTENT_TOKENS = 25_000;
export const MAX_WEB_FETCHES = 5;
export const MAX_WEB_SEARCHES = 5;

/**
 * `filtersWebResults` marks the models that run the web tools from inside code execution,
 * which strips irrelevant content before it reaches the context window. Claude 4.6 and up
 * support this; older models only accept the basic tool versions.
 */
export const MODELS = [
    {id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', filtersWebResults: false},
    {id: 'claude-sonnet-5', name: 'Claude Sonnet 5', filtersWebResults: true},
    {id: 'claude-opus-5', name: 'Claude Opus 5', filtersWebResults: true},
    {id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (deprecated)', filtersWebResults: true},
    {id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (deprecated)', filtersWebResults: true}
] as const;
