import Anthropic from '@anthropic-ai/sdk';
import type { ApiRequest } from '@basmilius/homey-common';
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL, HOMEY_MCP_AUTH_ENDPOINT, SETTING_API_KEY, SETTING_DEFAULT_MODEL, SETTING_MAX_TOKENS } from './src/const';
import type { ClaudeApp } from './src/types';

type AppRequest<TBody = never> = ApiRequest<ClaudeApp, TBody>;

/**
 * Stores pending PKCE state between the auth-url request and the OAuth callback.
 * Keyed by the OAuth state parameter.
 */
const pendingAuthStates = new Map<string, PendingAuthState>();

/**
 * Handles REST API endpoints for the Claude app settings page.
 */
module.exports = {
    getSettings({homey}: AppRequest) {
        return {
            apiKey: homey.settings.get(SETTING_API_KEY) ?? null,
            defaultModel: homey.settings.get(SETTING_DEFAULT_MODEL) ?? DEFAULT_MODEL,
            maxTokens: homey.settings.get(SETTING_MAX_TOKENS) ?? DEFAULT_MAX_TOKENS
        };
    },

    saveSettings({homey, body}: AppRequest<{ key: string; value: unknown }>) {
        homey.settings.set(body.key, body.value);
    },

    async testConnection({homey}: AppRequest) {
        const apiKey = homey.settings.get(SETTING_API_KEY) as string | null;

        if (!apiKey) {
            throw new Error('API key is not configured.');
        }

        const client = new Anthropic({apiKey});

        try {
            await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 16,
                messages: [{role: 'user', content: 'Hi'}]
            });
        } catch (err) {
            if (err instanceof Anthropic.AuthenticationError) {
                throw new Error('Invalid API key.');
            }

            // Any other error (credits, rate limits, etc.) means the key is valid.
        }
    },

    async getHomeyOauthAuthUrl(request: AppRequest) {
        const {homey} = request;
        const origin = (request as any).query?.origin as string | undefined;

        if (!origin) {
            throw new Error('Missing origin parameter.');
        }

        const app = homey.app as unknown as ClaudeApp;
        const hostname = new URL(origin).hostname;

        const codeVerifier = generateRandomString(64);
        const state = generateRandomString(32);
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Start the callback server — it listens on a random port and handles the redirect
        const redirectUri = await app.brain.callbackServer.start(hostname, async (code, callbackState) => {
            const pending = pendingAuthStates.get(callbackState);

            if (!pending) {
                throw new Error('Unknown or expired OAuth state. Please try connecting again.');
            }

            pendingAuthStates.delete(callbackState);
            await app.brain.homeyMcp.exchangeCode(code, pending.redirectUri, pending.codeVerifier);
        });

        pendingAuthStates.set(state, {codeVerifier, redirectUri});

        // Clean up stale state after 10 minutes
        setTimeout(() => pendingAuthStates.delete(state), 10 * 60 * 1000);

        const {clientId} = await app.brain.homeyMcp.registerClient(redirectUri);

        const authUrl = new URL(HOMEY_MCP_AUTH_ENDPOINT);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');

        return {authUrl: authUrl.toString()};
    },

    getHomeyOauthStatus({homey}: AppRequest) {
        const app = homey.app as unknown as ClaudeApp;
        return {connected: app.brain.homeyMcp.isConnected};
    },

    deleteHomeyOauthDisconnect({homey}: AppRequest) {
        const app = homey.app as unknown as ClaudeApp;
        app.brain.homeyMcp.disconnect();
        return {success: true};
    }
};

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(digest).toString('base64url');
}

function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}

type PendingAuthState = {
    readonly codeVerifier: string;
    readonly redirectUri: string;
};
