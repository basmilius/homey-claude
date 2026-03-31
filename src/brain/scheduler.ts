import { Shortcuts } from '@basmilius/homey-common';
import { HOMEY_MCP_SERVER_URL, SETTING_SCHEDULED_COMMANDS } from '../const';
import { ScheduledCommandExecuted } from '../flow/trigger';
import type { ClaudeApp, DurationUnit } from '../types';

/**
 * Maximum delay for a single `setTimeout` call (2^31 - 1 ms, ~24.8 days).
 * Longer delays are split into chained timeouts.
 */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Grace period in milliseconds for timers that should have already fired
 * (e.g. due to app restart). Timers within this window are executed immediately.
 */
const FINISH_GRACE_PERIOD_MS = 5_000;

/**
 * Manages scheduled command timers that are sent to Claude after a delay.
 *
 * Timers are persisted to Homey settings so they survive app restarts.
 * Large delays that exceed JavaScript's setTimeout limit are automatically
 * split into chained timeouts.
 */
export default class Scheduler extends Shortcuts<ClaudeApp> {
    readonly #timeouts: Map<string, NodeJS.Timeout>;

    constructor(app: ClaudeApp) {
        super(app);
        this.#timeouts = new Map();
    }

    /**
     * Restores any pending scheduled commands from persistent storage.
     * Should be called during app initialization.
     */
    restore(): void {
        const commands = this.#getPersistedCommands();
        let restored = 0;

        for (const command of commands) {
            const remaining = command.executeAt - Date.now();

            if (remaining <= -FINISH_GRACE_PERIOD_MS) {
                // Too far past due — silently remove.
                this.#removePersistedCommand(command.id);
                this.app.log(`Removed expired scheduled command "${command.id}".`);
            } else if (remaining <= 0) {
                // Within grace period — execute immediately.
                this.#execute(command);
                restored++;
            } else {
                this.#scheduleTimeout(command);
                restored++;
            }
        }

        this.app.log(`Restored ${restored} scheduled command(s).`);
    }

    /**
     * Schedules a new command to be sent to Claude after the given delay.
     *
     * @param command - The prompt/command text to send to Claude.
     * @param duration - The delay duration before execution.
     * @param unit - The duration unit (seconds, minutes, hours, days).
     * @returns The unique timer ID for this scheduled command.
     */
    schedule(command: string, duration: number, unit: DurationUnit): string {
        const id = crypto.randomUUID();
        const delayMs = convertDurationToMs(duration, unit);

        const entry: ScheduledCommand = {
            id,
            command,
            duration,
            unit,
            createdAt: Date.now(),
            executeAt: Date.now() + delayMs
        };

        this.#persistCommand(entry);
        this.#scheduleTimeout(entry);

        this.app.log(`Scheduled command "${id}" in ${duration} ${unit} (${delayMs}ms).`);

        return id;
    }

    /**
     * Cancels a previously scheduled command.
     *
     * @param id - The timer ID of the command to cancel.
     * @returns Whether a command was found and cancelled.
     */
    cancel(id: string): boolean {
        this.#clearTimeout(id);

        const commands = this.#getPersistedCommands();
        const filtered = commands.filter((entry) => entry.id !== id);

        if (filtered.length === commands.length) {
            return false;
        }

        this.settings.set(SETTING_SCHEDULED_COMMANDS, filtered);
        this.app.log(`Cancelled scheduled command "${id}".`);

        return true;
    }

    /**
     * Returns all currently scheduled commands.
     */
    getScheduledCommands(): ScheduledCommand[] {
        return this.#getPersistedCommands();
    }

    /**
     * Schedules a timeout for the given command entry.
     * If the remaining delay exceeds {@link MAX_TIMEOUT_MS}, a chained intermediate
     * timeout is used that reschedules itself until the actual target is reached.
     */
    #scheduleTimeout(entry: ScheduledCommand): void {
        this.#clearTimeout(entry.id);

        const remaining = Math.max(0, entry.executeAt - Date.now());
        const delay = Math.min(remaining, MAX_TIMEOUT_MS);

        const timeout = setTimeout(() => {
            this.#timeouts.delete(entry.id);

            const nowRemaining = entry.executeAt - Date.now();

            if (nowRemaining > 1000) {
                // Still time left — chain another timeout for large delays.
                this.#scheduleTimeout(entry);
            } else {
                this.#execute(entry);
            }
        }, delay);

        this.#timeouts.set(entry.id, timeout);
    }

    #clearTimeout(id: string): void {
        const existing = this.#timeouts.get(id);

        if (existing) {
            clearTimeout(existing);
            this.#timeouts.delete(id);
        }
    }

    async #execute(entry: ScheduledCommand): Promise<void> {
        this.#removePersistedCommand(entry.id);

        let success = false;
        let response = '';

        try {
            const result = await this.#askWithHomeyContext(entry.command);
            success = true;
            response = result.answer;
        } catch (err) {
            response = err instanceof Error ? err.message : String(err);
        }

        this.app.log(`Executed scheduled command "${entry.id}": success=${success}`);

        try {
            const trigger = this.app.registry.findTrigger(ScheduledCommandExecuted);
            await trigger?.trigger({}, {
                timer_id: entry.id,
                command: entry.command,
                success,
                response
            });
        } catch (err) {
            this.app.error('Failed to fire scheduled command trigger.', err);
        }
    }

    /**
     * Sends a command to Claude, using Homey MCP context if connected.
     * Falls back to a regular prompt if MCP is not available.
     */
    async #askWithHomeyContext(command: string): Promise<{ answer: string; model: string }> {
        const homeyMcp = this.app.brain.homeyMcp;

        if (homeyMcp.isConnected) {
            try {
                const accessToken = await homeyMcp.getAccessToken();

                return await this.app.brain.claude.askWithMcpServers(
                    command,
                    [{
                        type: 'url',
                        name: 'homey',
                        url: HOMEY_MCP_SERVER_URL,
                        authorization_token: accessToken
                    }]
                );
            } catch (err) {
                this.app.error('Homey MCP unavailable for scheduled command, falling back to plain ask.', err);
            }
        }

        return this.app.brain.claude.ask(command);
    }

    #getPersistedCommands(): ScheduledCommand[] {
        return (this.settings.get(SETTING_SCHEDULED_COMMANDS) as ScheduledCommand[] | null) ?? [];
    }

    #persistCommand(entry: ScheduledCommand): void {
        const commands = this.#getPersistedCommands();
        commands.push(entry);
        this.settings.set(SETTING_SCHEDULED_COMMANDS, commands);
    }

    #removePersistedCommand(id: string): void {
        const commands = this.#getPersistedCommands();
        const filtered = commands.filter((entry) => entry.id !== id);
        this.settings.set(SETTING_SCHEDULED_COMMANDS, filtered);
    }
}

/**
 * Converts a duration and unit to milliseconds.
 *
 * @param duration - The numeric duration.
 * @param unit - The duration unit.
 */
function convertDurationToMs(duration: number, unit: DurationUnit): number {
    switch (unit) {
        case 'seconds':
            return duration * 1_000;
        case 'minutes':
            return duration * 60_000;
        case 'hours':
            return duration * 3_600_000;
        case 'days':
            return duration * 86_400_000;
    }
}

export type ScheduledCommand = {
    readonly id: string;
    readonly command: string;
    readonly duration: number;
    readonly unit: DurationUnit;
    readonly createdAt: number;
    readonly executeAt: number;
};
