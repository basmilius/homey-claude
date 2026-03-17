import {action, FlowActionEntity} from '@basmilius/homey-common';
import type {ClaudeApp} from '../../types';

/**
 * Action: Send a conversation message with a specific model chosen per flow card.
 */
@action('conversation_message_with_model')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const history = this.app.brain.conversation.getHistory(args.conversation_id);
        const newHistory = [...history, {role: 'user' as const, content: args.message}];

        const {answer, model} = await this.app.brain.claude.askWithHistory(
            newHistory,
            undefined,
            args.model
        );

        this.app.brain.conversation.setHistory(args.conversation_id, [
            ...newHistory,
            {role: 'assistant' as const, content: answer}
        ]);

        return {response: answer, model_used: model};
    }
}

type Args = {
    readonly conversation_id: string;
    readonly message: string;
    readonly model: string;
};

type Result = {
    readonly response: string;
    readonly model_used: string;
};
