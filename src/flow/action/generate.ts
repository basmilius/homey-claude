import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Generate text from a prompt using Claude.
 */
@action('generate')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const {answer, model} = await this.app.brain.claude.ask(
            args.prompt
        );

        return {result: answer, model_used: model};
    }
}

type Args = {
    readonly prompt: string;
};

type Result = {
    readonly result: string;
    readonly model_used: string;
};
