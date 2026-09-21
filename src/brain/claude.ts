import Anthropic from '@anthropic-ai/sdk';
import type { Base64ImageSource } from '@anthropic-ai/sdk/resources/messages/messages';
import type { BetaRequestMCPServerURLDefinition } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { Shortcuts } from '@basmilius/homey-common';
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL, MAX_SERVER_TOOL_TURNS, MAX_WEB_CONTENT_TOKENS, MAX_WEB_FETCHES, MAX_WEB_SEARCHES, MODELS, SETTING_API_KEY, SETTING_DEFAULT_MODEL, SETTING_DEFAULT_SYSTEM_PROMPT, SETTING_MAX_TOKENS } from '../const';
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
        const params = this.#buildParams(systemPrompt, model, maxTokens);

        return this.#execute([{role: 'user', content: prompt}], messages => client.messages.create({...params, messages}));
    }

    /**
     * Sends a full conversation history to Claude and returns the response.
     */
    async askWithHistory(messages: ConversationMessage[], systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(systemPrompt, model, maxTokens);

        return this.#execute(messages, history => client.messages.create({...params, messages: history}));
    }

    /**
     * Sends a message with an image to Claude for visual analysis.
     *
     * @param prompt - The text prompt describing what to analyze.
     * @param imageBuffer - The raw image data as a Buffer.
     * @param mimeType - The MIME type of the image (e.g. image/jpeg, image/png).
     * @param systemPrompt - Optional system prompt override.
     * @param model - Optional model override.
     * @param maxTokens - Optional max tokens override.
     */
    async askWithImage(prompt: string, imageBuffer: Buffer, mimeType: string, systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(systemPrompt, model, maxTokens);

        const imageSource: Base64ImageSource = {
            type: 'base64',
            media_type: mimeType as Base64ImageSource['media_type'],
            data: imageBuffer.toString('base64')
        };

        const message: Anthropic.MessageParam = {
            role: 'user',
            content: [
                {type: 'image', source: imageSource},
                {type: 'text', text: prompt}
            ]
        };

        return this.#execute([message], messages => client.messages.create({...params, messages}));
    }

    /**
     * Sends a message to Claude with access to one or more MCP servers as tools.
     */
    async askWithMcpServers(prompt: string, mcpServers: BetaRequestMCPServerURLDefinition[], systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(systemPrompt, model, maxTokens);

        return this.#execute([{role: 'user', content: prompt}], messages => client.beta.messages.create({
            ...params,
            messages,
            betas: ['mcp-client-2025-11-20'],
            mcp_servers: mcpServers,
            tools: mcpServers.map(server => ({type: 'mcp_toolset', mcp_server_name: server.name}))
        }));
    }

    /**
     * Sends a message to Claude with one or more custom skills loaded. Skills run inside the
     * code execution container, which the tool below provisions.
     */
    async askWithSkills(prompt: string, skillIds: string[], systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(systemPrompt, model, maxTokens);

        return this.#execute([{role: 'user', content: prompt}], messages => client.messages.create({
            ...params,
            messages,
            container: {skills: skillIds.map(id => ({type: 'custom', skill_id: id, version: 'latest'}))},
            tools: [{type: 'code_execution_20260521', name: 'code_execution'}]
        }));
    }

    /**
     * Sends a message to Claude with the web search and web fetch tools enabled, so it can
     * look up current information and read pages linked from the prompt.
     */
    async askWithWebTools(prompt: string, systemPrompt?: string, model?: string, maxTokens?: number): Promise<AskResult> {
        const client = this.#createClient();
        const params = this.#buildParams(systemPrompt, model, maxTokens);
        const tools = webToolsFor(params.model);

        return this.#execute([{role: 'user', content: prompt}], messages => client.messages.create({...params, messages, tools}));
    }

    #buildParams(systemPrompt?: string, model?: string, maxTokens?: number): RequestParams {
        const resolvedModel = model && model !== 'default'
            ? model
            : (this.settings.get(SETTING_DEFAULT_MODEL) as string | null ?? DEFAULT_MODEL);

        const resolvedMaxTokens = maxTokens
            ?? (this.settings.get(SETTING_MAX_TOKENS) as number | null ?? DEFAULT_MAX_TOKENS);

        const resolvedSystemPrompt = systemPrompt
            ?? (this.settings.get(SETTING_DEFAULT_SYSTEM_PROMPT) as string | null ?? undefined);

        const params: RequestParams = {
            model: resolvedModel,
            max_tokens: resolvedMaxTokens,
            stream: false
        };

        if (resolvedSystemPrompt) {
            params.system = resolvedSystemPrompt;
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

    /**
     * Sends the request and keeps going while the API pauses the turn, which happens when a
     * server-side tool needs more work than one response allows. The paused assistant turn has
     * to be sent back unchanged for the API to resume it.
     */
    async #execute(messages: readonly Anthropic.MessageParam[], send: (messages: Anthropic.MessageParam[]) => Promise<Response>): Promise<AskResult> {
        const history = [...messages];

        try {
            for (let turn = 0; turn < MAX_SERVER_TOOL_TURNS; ++turn) {
                const response = await send(history);

                if (response.stop_reason !== 'pause_turn') {
                    return {answer: answerFrom(response.content), model: response.model};
                }

                history.push({role: 'assistant', content: response.content as Anthropic.ContentBlockParam[]});
            }
        } catch (err) {
            throw asFlowError(err);
        }

        throw new Error('Claude kept working without reaching an answer. Try a simpler question.');
    }
}

/**
 * Returns Claude's closing answer: every text block that follows the last non-text block.
 * Tool use leaves intermediate remarks earlier in the response, and citations split the
 * closing answer across consecutive blocks.
 */
function answerFrom(content: readonly ContentBlock[]): string {
    const lastNonText = content.findLastIndex(block => block.type !== 'text');

    const answer = content
        .slice(lastNonText + 1)
        .map(block => block.text ?? '')
        .join('');

    if (!answer) {
        throw new Error('Unexpected response type from Claude API.');
    }

    return answer;
}

/**
 * Turns SDK errors into messages that make sense on a flow card.
 */
function asFlowError(err: unknown): Error {
    if (err instanceof Anthropic.AuthenticationError) {
        return new Error('Invalid API key. Please check your settings.');
    }

    if (err instanceof Anthropic.APIError) {
        return new Error(err.error && typeof err.error === 'object' && 'error' in err.error
            ? (err.error as any).error.message
            : err.message);
    }

    return err instanceof Error ? err : new Error(String(err));
}

/**
 * Builds the web tool definitions a model accepts. Unknown models fall back to the basic
 * versions, which every model supports.
 */
function webToolsFor(model: string): Anthropic.Messages.ToolUnion[] {
    const filtersResults = MODELS.find(entry => entry.id === model)?.filtersWebResults ?? false;

    if (!filtersResults) {
        return [
            {type: 'web_search_20250305', name: 'web_search', max_uses: MAX_WEB_SEARCHES},
            {type: 'web_fetch_20250910', name: 'web_fetch', max_uses: MAX_WEB_FETCHES, max_content_tokens: MAX_WEB_CONTENT_TOKENS}
        ];
    }

    return [
        {type: 'web_search_20260318', name: 'web_search', max_uses: MAX_WEB_SEARCHES, response_inclusion: 'excluded'},
        {type: 'web_fetch_20260318', name: 'web_fetch', max_uses: MAX_WEB_FETCHES, max_content_tokens: MAX_WEB_CONTENT_TOKENS, response_inclusion: 'excluded'}
    ];
}

export type AskResult = {
    readonly answer: string;
    readonly model: string;
};

type ContentBlock = {
    readonly type: string;
    readonly text?: string;
};

type RequestParams = Omit<Anthropic.MessageCreateParamsNonStreaming, 'messages'>;

type Response = {
    readonly content: readonly ContentBlock[];
    readonly model: string;
    readonly stop_reason: string | null;
};
