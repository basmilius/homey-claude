import { action, FlowActionEntity } from '@basmilius/homey-common';
import { HOMEY_MCP_SERVER_URL } from '../../const';
import type { ClaudeApp } from '../../types';

/**
 * Action: Ask Claude a question with access to Homey via MCP.
 */
@action('ask_with_homey')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const accessToken = await this.app.brain.homeyMcp.getAccessToken();

        const {answer, model} = await this.app.brain.claude.askWithMcpServers(
            args.question,
            [{
                type: 'url',
                name: 'homey',
                url: HOMEY_MCP_SERVER_URL,
                authorization_token: accessToken
            }]
        );

        await this.app.triggerResponseReady(answer, model);

        return {answer, model_used: model};
    }
}

type Args = {
    readonly question: string;
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
