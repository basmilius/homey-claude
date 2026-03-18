import { Shortcuts } from '@basmilius/homey-common';
import { HOMEY_MCP_REGISTER_ENDPOINT, HOMEY_MCP_SERVER_URL, HOMEY_MCP_TOKEN_ENDPOINT, SETTING_HOMEY_MCP_ACCESS_TOKEN, SETTING_HOMEY_MCP_CLIENT_ID, SETTING_HOMEY_MCP_CLIENT_SECRET, SETTING_HOMEY_MCP_REFRESH_TOKEN, SETTING_HOMEY_MCP_TOKEN_EXPIRES_AT } from '../const';
import type { ClaudeApp } from '../types';

/**
 * Manages the Homey MCP server OAuth connection and provides the server config for Claude API calls.
 */
export default class HomeyMcp extends Shortcuts<ClaudeApp> {
    constructor(app: ClaudeApp) {
        super(app);
    }

    /**
     * Returns whether a valid access token is stored.
     */
    get isConnected(): boolean {
        return !!this.settings.get(SETTING_HOMEY_MCP_ACCESS_TOKEN);
    }

    /**
     * Returns a valid access token, refreshing it if needed.
     * Throws if not connected.
     */
    async getAccessToken(): Promise<string> {
        const expiresAt = this.settings.get(SETTING_HOMEY_MCP_TOKEN_EXPIRES_AT) as number | null;
        const isExpired = expiresAt !== null && Date.now() >= expiresAt - 60_000;

        if (isExpired) {
            await this.#refreshToken();
        }

        const accessToken = this.settings.get(SETTING_HOMEY_MCP_ACCESS_TOKEN) as string | null;

        if (!accessToken) {
            throw new Error('Homey MCP is not connected. Please authenticate in the app settings.');
        }

        return accessToken;
    }

    /**
     * Registers a new OAuth client via dynamic client registration.
     * Always registers fresh to ensure the redirect_uri matches the current settings page URL.
     * Returns the client_id and client_secret.
     */
    async registerClient(redirectUri: string): Promise<{ clientId: string; clientSecret: string }> {
        const response = await fetch(HOMEY_MCP_REGISTER_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                client_name: 'Claude for Homey',
                redirect_uris: [redirectUri],
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code']
            })
        });

        if (!response.ok) {
            throw new Error(`OAuth client registration failed: ${response.status}`);
        }

        const data = await response.json() as { client_id: string; client_secret: string };

        this.settings.set(SETTING_HOMEY_MCP_CLIENT_ID, data.client_id);
        this.settings.set(SETTING_HOMEY_MCP_CLIENT_SECRET, data.client_secret);

        return {clientId: data.client_id, clientSecret: data.client_secret};
    }

    /**
     * Exchanges an authorization code for an access token and stores it.
     */
    async exchangeCode(code: string, redirectUri: string, codeVerifier: string): Promise<void> {
        const clientId = this.settings.get(SETTING_HOMEY_MCP_CLIENT_ID) as string | null;
        const clientSecret = this.settings.get(SETTING_HOMEY_MCP_CLIENT_SECRET) as string | null;

        if (!clientId || !clientSecret) {
            throw new Error('OAuth client is not registered.');
        }

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        });

        const response = await fetch(HOMEY_MCP_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${response.status} — ${error}`);
        }

        const data = await response.json() as TokenResponse;
        this.#storeTokens(data);
    }

    /**
     * Returns the MCP server URL for use in Claude API calls.
     */
    get serverUrl(): string {
        return HOMEY_MCP_SERVER_URL;
    }

    /**
     * Clears all stored OAuth credentials and tokens.
     */
    disconnect(): void {
        this.settings.unset(SETTING_HOMEY_MCP_ACCESS_TOKEN);
        this.settings.unset(SETTING_HOMEY_MCP_REFRESH_TOKEN);
        this.settings.unset(SETTING_HOMEY_MCP_TOKEN_EXPIRES_AT);
        this.settings.unset(SETTING_HOMEY_MCP_CLIENT_ID);
        this.settings.unset(SETTING_HOMEY_MCP_CLIENT_SECRET);
    }

    async #refreshToken(): Promise<void> {
        const refreshToken = this.settings.get(SETTING_HOMEY_MCP_REFRESH_TOKEN) as string | null;
        const clientId = this.settings.get(SETTING_HOMEY_MCP_CLIENT_ID) as string | null;
        const clientSecret = this.settings.get(SETTING_HOMEY_MCP_CLIENT_SECRET) as string | null;

        if (!refreshToken || !clientId || !clientSecret) {
            this.disconnect();
            throw new Error('Cannot refresh Homey MCP token — please re-authenticate in the app settings.');
        }

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });

        const response = await fetch(HOMEY_MCP_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body.toString()
        });

        if (!response.ok) {
            this.disconnect();
            throw new Error('Homey MCP token refresh failed — please re-authenticate in the app settings.');
        }

        const data = await response.json() as TokenResponse;
        this.#storeTokens(data);
    }

    #storeTokens(data: TokenResponse): void {
        this.settings.set(SETTING_HOMEY_MCP_ACCESS_TOKEN, data.access_token);

        if (data.refresh_token) {
            this.settings.set(SETTING_HOMEY_MCP_REFRESH_TOKEN, data.refresh_token);
        }

        if (data.expires_in) {
            this.settings.set(SETTING_HOMEY_MCP_TOKEN_EXPIRES_AT, Date.now() + data.expires_in * 1000);
        }
    }
}

type TokenResponse = {
    readonly access_token: string;
    readonly refresh_token?: string;
    readonly expires_in?: number;
    readonly token_type: string;
};
