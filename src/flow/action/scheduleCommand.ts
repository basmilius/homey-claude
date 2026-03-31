import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp, DurationUnit } from '../../types';

/**
 * Action: Schedule a command to be sent to Claude after a delay.
 */
@action('schedule_command')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const timerId = this.app.brain.scheduler.schedule(
            args.command,
            args.duration,
            args.unit
        );

        return {timer_id: timerId};
    }
}

type Args = {
    readonly command: string;
    readonly duration: number;
    readonly unit: DurationUnit;
};

type Result = {
    readonly timer_id: string;
};
