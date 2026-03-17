import {Shortcuts} from '@basmilius/homey-common';
import type {ClaudeApp, ConversationMessage} from '../types';

/**
 * Manages multi-turn conversation histories in memory.
 */
export default class Conversation extends Shortcuts<ClaudeApp> {
    readonly #histories: Map<string, ConversationMessage[]>;

    constructor(app: ClaudeApp) {
        super(app);
        this.#histories = new Map();
    }

    /**
     * Retrieves the conversation history for the given ID.
     */
    getHistory(conversationId: string): ConversationMessage[] {
        return this.#histories.get(conversationId) ?? [];
    }

    /**
     * Replaces the full conversation history for the given ID.
     */
    setHistory(conversationId: string, messages: ConversationMessage[]): void {
        this.#histories.set(conversationId, messages);
    }

    /**
     * Clears the conversation history for the given ID.
     */
    clear(conversationId: string): void {
        this.#histories.delete(conversationId);
    }
}
