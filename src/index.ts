import { App } from '@basmilius/homey-common';
import { Brain } from './brain';
import { Actions, Conditions, Triggers } from './flow';
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
            this.#registerTriggers();

            this.#brain.scheduler.restore();

            this.log('Claude has been initialized!');
        } catch (err) {
            this.error('Failed initializing Claude.', err);
        }
    }

    /**
     * Fires the response_ready trigger with the given response text and model.
     *
     * @param response - The response text from Claude.
     * @param modelUsed - The model that generated the response.
     */
    async triggerResponseReady(response: string, modelUsed: string): Promise<void> {
        await this.registry.fireTrigger(Triggers.ResponseReady, {}, {
            response,
            model_used: modelUsed
        });
    }

    /**
     * Fires the image_response_ready trigger with the given response text and model.
     *
     * @param response - The image analysis response text from Claude.
     * @param modelUsed - The model that generated the response.
     */
    async triggerImageResponseReady(response: string, modelUsed: string): Promise<void> {
        await this.registry.fireTrigger(Triggers.ImageResponseReady, {}, {
            response,
            model_used: modelUsed
        });
    }

    #registerActions(): void {
        this.registry.action(Actions.AnalyzeImage);
        this.registry.action(Actions.AnalyzeImageWithModel);
        this.registry.action(Actions.ApplyMood);
        this.registry.action(Actions.ApplyMoodWithModel);
        this.registry.action(Actions.Ask);
        this.registry.action(Actions.AskWithHomey);
        this.registry.action(Actions.AskWithModel);
        this.registry.action(Actions.ClassifyIntent);
        this.registry.action(Actions.ClassifyIntentWithModel);
        this.registry.action(Actions.ConversationClear);
        this.registry.action(Actions.ConversationMessage);
        this.registry.action(Actions.ConversationMessageWithModel);
        this.registry.action(Actions.ConversationSeedContext);
        this.registry.action(Actions.Generate);
        this.registry.action(Actions.GenerateWithModel);
        this.registry.action(Actions.ScheduleCommand);
        this.registry.action(Actions.Summarize);
        this.registry.action(Actions.SummarizeWithModel);
        this.registry.action(Actions.Translate);
        this.registry.action(Actions.TranslateWithModel);
    }

    #registerConditions(): void {
        this.registry.condition(Conditions.ResponseContains);
    }

    #registerTriggers(): void {
        this.registry.trigger(Triggers.ResponseReady);
        this.registry.trigger(Triggers.ImageResponseReady);
        this.registry.trigger(Triggers.ScheduledCommandExecuted);
    }
}
