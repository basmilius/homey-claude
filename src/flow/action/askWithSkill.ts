import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';
import { AutocompleteProviders } from '..';

/**
 * Action: Ask Claude a question with one of the configured skills loaded.
 */
@action('ask_with_skill')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onInit(): Promise<void> {
        this.registerAutocomplete('skill', AutocompleteProviders.Skill);

        await super.onInit();
    }

    async onRun(args: Args): Promise<Result> {
        const skill = this.app.brain.skills.require(args.skill.id);

        const {answer, model} = await this.app.brain.claude.askWithSkills(
            args.question,
            [skill]
        );

        await this.app.triggerResponseReady(answer, model);

        return {answer, model_used: model};
    }
}

type Args = {
    readonly question: string;
    readonly skill: {
        readonly id: string;
    };
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
