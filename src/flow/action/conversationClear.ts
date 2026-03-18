import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Action: Clear the conversation history for a named conversation.
 */
@action('conversation_clear')
export default class extends FlowActionEntity<ClaudeApp, Args> {
    async onRun(args: Args): Promise<void> {
        this.app.brain.conversation.clear(args.conversation_id);
    }
}

type Args = {
    readonly conversation_id: string;
};
