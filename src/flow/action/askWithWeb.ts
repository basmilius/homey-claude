import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Ask Claude a question it may look up on the web.
 */
@action('ask_with_web')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const {answer, model} = await this.app.brain.claude.askWithWebTools(
            args.question
        );

        await this.app.triggerResponseReady(answer, model);

        return {answer, model_used: model};
    }
}

type Args = {
    readonly question: string;
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
