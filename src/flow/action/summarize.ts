import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Summarize a text using Claude.
 */
@action('summarize')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const languageInstruction = args.language === 'same'
            ? 'in the same language as the input text'
            : `in ${args.language}`;

        const prompt = `Please summarize the following text ${languageInstruction}. Provide only the summary, no additional commentary:\n\n${args.text}`;

        const {answer, model} = await this.app.brain.claude.ask(prompt);

        return {summary: answer, model_used: model};
    }
}

type Args = {
    readonly text: string;
    readonly language: string;
};

type Result = {
    readonly summary: string;
    readonly model_used: string;
};
