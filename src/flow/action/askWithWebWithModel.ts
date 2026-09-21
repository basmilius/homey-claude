import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Ask Claude a question it may look up on the web, with a specific model chosen per flow card.
 */
@action('ask_with_web_with_model')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const {answer, model} = await this.app.brain.claude.askWithWebTools(
            args.question,
            undefined,
            args.model
        );

        await this.app.triggerResponseReady(answer, model);

        return {answer, model_used: model};
    }
}

type Args = {
    readonly question: string;
    readonly model: string;
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
