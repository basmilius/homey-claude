import { FlowTriggerEntity, trigger } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Trigger: Fires when Claude has finished analyzing an image.
 */
@trigger('image_response_ready')
export default class extends FlowTriggerEntity<ClaudeApp, unknown, unknown, Tokens> {
    async onRun(): Promise<boolean> {
        return true;
    }
}

type Tokens = {
    readonly response: string;
    readonly model_used: string;
};
