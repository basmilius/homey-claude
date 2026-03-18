import Anthropic from '@anthropic-ai/sdk';
import type { BetaRequestMCPServerURLDefinition } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { Shortcuts } from '@basmilius/homey-common';
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL, SETTING_API_KEY, SETTING_DEFAULT_MODEL, SETTING_MAX_TOKENS } from '../const';
import type { ClaudeApp, ConversationMessage } from '../types';

/**
 * Wraps the Anthropic SDK and provides methods for interacting with the Claude API.
 */
export default class Claude extends Shortcuts<ClaudeApp> {
    constructor(app: ClaudeApp) {
        super(app);
    }

    /**
     * Sends a single message to Claude and returns the response.
     */
    async ask(prompt: string, systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams([{role: 'user', content: prompt}], systemPrompt, model, maxTokens);
        return this.#executeRequest(client, params);
    }

    /**
     * Sends a full conversation history to Claude and returns the response.
     */
    async askWithHistory(messages: ConversationMessage[], systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(messages, systemPrompt, model, maxTokens);
        return this.#executeRequest(client, params);
    }

    /**
     * Sends a message to Claude with access to one or more MCP servers as tools.
     */
    async askWithMcpServers(prompt: string, mcpServers: BetaRequestMCPServerURLDefinition[], systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams([{role: 'user', content: prompt}], systemPrompt, model, maxTokens);

        return this.#executeMcpRequest(client, params, mcpServers);
    }

    #buildParams(messages: ConversationMessage[], systemPrompt?: string, model?: string, maxTokens?: number): Anthropic.MessageCreateParamsNonStreaming {
        const resolvedModel = model && model !== 'default'
            ? model
            : (this.settings.get(SETTING_DEFAULT_MODEL) as string | null ?? DEFAULT_MODEL);

        const resolvedMaxTokens = maxTokens
            ?? (this.settings.get(SETTING_MAX_TOKENS) as number | null ?? DEFAULT_MAX_TOKENS);

        const params: Anthropic.MessageCreateParamsNonStreaming = {
            model: resolvedModel,
            max_tokens: resolvedMaxTokens,
            messages,
            stream: false
        };

        if (systemPrompt) {
            params.system = systemPrompt;
        }

        return params;
    }

    #createClient(): Anthropic {
        const apiKey = this.settings.get(SETTING_API_KEY) as string | null;

        if (!apiKey) {
            throw new Error('Claude API key is not configured. Please set your API key in the app settings.');
        }

        return new Anthropic({apiKey});
    }

    async #executeMcpRequest(client: Anthropic, params: Anthropic.MessageCreateParamsNonStreaming, mcpServers: BetaRequestMCPServerURLDefinition[]): Promise<AskResult> {
        try {
            const response = await client.beta.messages.create({
                ...params,
                mcp_servers: mcpServers
            }, {
                headers: {'anthropic-beta': 'mcp-client-2025-04-04'}
            });

            const content = response.content.findLast(block => block.type === 'text');

            if (!content || content.type !== 'text') {
                throw new Error('Unexpected response type from Claude API.');
            }

            return {answer: content.text, model: response.model};
        } catch (err) {
            if (err instanceof Anthropic.AuthenticationError) {
                throw new Error('Invalid API key. Please check your settings.');
            }

            if (err instanceof Anthropic.APIError) {
                throw new Error(err.error && typeof err.error === 'object' && 'error' in err.error
                    ? (err.error as any).error.message
                    : err.message);
            }

            throw err;
        }
    }

    async #executeRequest(client: Anthropic, params: Anthropic.MessageCreateParamsNonStreaming): Promise<AskResult> {
        try {
            const response = await client.messages.create(params);
            const content = response.content[0];

            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude API.');
            }

            return {
                answer: content.text,
                model: response.model
            };
        } catch (err) {
            if (err instanceof Anthropic.AuthenticationError) {
                throw new Error('Invalid API key. Please check your settings.');
            }

            if (err instanceof Anthropic.APIError) {
                throw new Error(err.error && typeof err.error === 'object' && 'error' in err.error
                    ? (err.error as any).error.message
                    : err.message);
            }

            throw err;
        }
    }
}

export type AskResult = {
    readonly answer: string;
    readonly model: string;
};
