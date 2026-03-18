import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Translate text with a specific model chosen per flow card.
 */
@action('translate_with_model')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const prompt = `Translate the following text to ${args.target_language}. Provide only the translation, no additional commentary:\n\n${args.text}`;

        const {answer, model} = await this.app.brain.claude.ask(prompt, undefined, args.model);

        return {translation: answer, model_used: model};
    }
}

type Args = {
    readonly text: string;
    readonly target_language: string;
    readonly model: string;
};

type Result = {
    readonly translation: string;
    readonly model_used: string;
};
