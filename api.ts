import Anthropic from '@anthropic-ai/sdk';
import type {ApiRequest} from '@basmilius/homey-common';
import {DEFAULT_MAX_TOKENS, DEFAULT_MODEL, SETTING_API_KEY, SETTING_DEFAULT_MODEL, SETTING_MAX_TOKENS} from './src/const';
import type {ClaudeApp} from './src/types';

type AppRequest<TBody = never> = ApiRequest<ClaudeApp, TBody>;

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

    saveSettings({homey, body}: AppRequest<{key: string; value: unknown}>) {
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
    }
};
