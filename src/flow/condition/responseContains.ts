import {condition, FlowConditionEntity} from '@basmilius/homey-common';
import type {ClaudeApp} from '../../types';

/**
 * Condition: Check if a text contains a given substring (case-insensitive).
 */
@condition('response_contains')
export default class extends FlowConditionEntity<ClaudeApp, Args, never> {
    async onRun(args: Args): Promise<boolean> {
        return args.text.toLowerCase().includes(args.needle.toLowerCase());
    }
}

type Args = {
    readonly text: string;
    readonly needle: string;
};
