import type App from './index';

export type ClaudeApp = App;

export type ConversationMessage = {
    readonly role: 'user' | 'assistant';
    readonly content: string;
};

export type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';
