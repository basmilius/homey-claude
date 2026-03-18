import { App } from '@basmilius/homey-common';
import { Brain } from './brain';
import { Actions, Conditions } from './flow';
import type { ClaudeApp } from './types';

export default class Claude extends App<ClaudeApp> {
    get brain(): Brain {
        return this.#brain;
    }

    readonly #brain: Brain;

    constructor(...args: any[]) {
        super(...args);

        this.#brain = new Brain(this as unknown as ClaudeApp);
    }

    async onInit(): Promise<void> {
        try {
            this.#registerActions();
            this.#registerConditions();

            this.log('Claude has been initialized!');
        } catch (err) {
            this.error('Failed initializing Claude.', err);
        }
    }

    #registerActions(): void {
        this.registry.action(Actions.Ask);
        this.registry.action(Actions.AskWithHomey);
        this.registry.action(Actions.AskWithModel);
        this.registry.action(Actions.ConversationClear);
        this.registry.action(Actions.ConversationMessage);
        this.registry.action(Actions.ConversationMessageWithModel);
        this.registry.action(Actions.Generate);
        this.registry.action(Actions.GenerateWithModel);
        this.registry.action(Actions.Summarize);
        this.registry.action(Actions.SummarizeWithModel);
        this.registry.action(Actions.Translate);
        this.registry.action(Actions.TranslateWithModel);
    }

    #registerConditions(): void {
        this.registry.condition(Conditions.ResponseContains);
    }
}
