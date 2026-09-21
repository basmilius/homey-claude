import type App from './index';

export type ClaudeApp = App;

export type ConversationMessage = {
    readonly role: 'user' | 'assistant';
    readonly content: string;
};

export type DurationUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export type SkillInput = {
    readonly displayName: string;
    readonly description: string;
    readonly instructions: string;
};

export type StoredSkill = SkillInput & {
    readonly id: string;

    /** Frontmatter name, fixed once the skill exists: a new version has to reuse it. */
    readonly name: string;

    readonly updatedAt: string;
};
