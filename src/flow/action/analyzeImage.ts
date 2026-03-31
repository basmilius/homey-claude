import type HomeyImage from 'homey/lib/Image';
import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';
import { imageToBuffer } from '../../util';

/**
 * Action: Analyze an image with Claude using visual analysis.
 */
@action('analyze_image')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const {buffer, mimeType} = await imageToBuffer(args.droptoken);
        const {answer, model} = await this.app.brain.claude.askWithImage(
            args.prompt,
            buffer,
            mimeType
        );

        return {answer, model_used: model};
    }
}

type Args = {
    readonly prompt: string;
    readonly droptoken: HomeyImage;
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
