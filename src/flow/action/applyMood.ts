import { action, FlowActionEntity } from '@basmilius/homey-common';
import { HOMEY_MCP_SERVER_URL } from '../../const';
import type { ClaudeApp } from '../../types';

const MOOD_SYSTEM_PROMPT = `You are a smart home mood controller. The user will describe a mood or atmosphere they want to create. Use the available Homey MCP tools to:
1. First, check which devices are available in the home
2. Determine the optimal settings for each relevant device to match the described mood
3. Apply the settings to the devices using the MCP tools
4. Respond with a brief, friendly confirmation of what you've set up

Focus on lighting (brightness, color temperature, color), thermostat, and any other controllable devices. Be creative but practical. Only adjust devices that are relevant to the requested mood.`;

/**
 * Action: Apply a mood/atmosphere to the home by controlling devices via MCP.
 */
@action('apply_mood')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const accessToken = await this.app.brain.homeyMcp.getAccessToken();

        const {answer, model} = await this.app.brain.claude.askWithMcpServers(
            `Apply this mood/atmosphere to my home: "${args.mood}"`,
            [{
                type: 'url',
                name: 'homey',
                url: HOMEY_MCP_SERVER_URL,
                authorization_token: accessToken
            }],
            MOOD_SYSTEM_PROMPT
        );

        await this.app.triggerResponseReady(answer, model);

        return {result: answer, model_used: model};
    }
}

type Args = {
    readonly mood: string;
};

type Result = {
    readonly result: string;
    readonly model_used: string;
};
