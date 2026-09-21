import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';
import { AutocompleteProviders } from '..';

/**
 * Action: Ask Claude a question with one of the configured skills loaded, using a specific
 * model chosen per flow card.
 */
@action('ask_with_skill_with_model')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onInit(): Promise<void> {
        this.registerAutocomplete('skill', AutocompleteProviders.Skill);

        await super.onInit();
    }

    async onRun(args: Args): Promise<Result> {
        const skill = this.app.brain.skills.require(args.skill.id);

        const {answer, model} = await this.app.brain.claude.askWithSkills(
            args.question,
            [skill],
            undefined,
            args.model
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
    readonly model: string;
};

type Result = {
    readonly answer: string;
    readonly model_used: string;
};
