import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Inject context into a conversation without sending it to Claude.
 * Adds the context as a user message with a brief assistant acknowledgment,
 * so it's available as history for subsequent messages in the same conversation.
 */
@action('conversation_seed_context')
export default class extends FlowActionEntity<ClaudeApp, Args> {
    async onRun(args: Args): Promise<void> {
        const history = this.app.brain.conversation.getHistory(args.conversation_id);

        this.app.brain.conversation.setHistory(args.conversation_id, [
            ...history,
            {role: 'user', content: `[Context] ${args.context}`},
            {role: 'assistant', content: 'Understood, I\'ll keep this context in mind.'}
        ]);
    }
}

type Args = {
    readonly conversation_id: string;
    readonly context: string;
};
