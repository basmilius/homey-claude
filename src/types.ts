import type App from './index';

export type ClaudeApp = App;

export type ConversationMessage = {
    readonly role: 'user' | 'assistant';
    readonly content: string;
};
