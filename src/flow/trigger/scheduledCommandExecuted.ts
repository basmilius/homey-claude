import { FlowTriggerEntity, trigger } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

/**
 * Trigger: Fires when a previously scheduled command has been executed.
 */
@trigger('scheduled_command_executed')
export default class extends FlowTriggerEntity<ClaudeApp, unknown, unknown, Tokens> {
    async onRun(): Promise<boolean> {
        return true;
    }
}

type Tokens = {
    readonly timer_id: string;
    readonly command: string;
    readonly success: boolean;
    readonly response: string;
};
