import { autocomplete, FlowAutocompleteProvider } from '@basmilius/homey-common';
import type Homey from 'homey';
import type { ClaudeApp } from '../../types';

/**
 * Autocomplete: the custom skills configured in the app settings.
 */
@autocomplete('skill')
export default class extends FlowAutocompleteProvider<ClaudeApp> {
    async find(query: string): Promise<Homey.FlowCard.ArgumentAutocompleteResults> {
        const needle = query.trim().toLowerCase();

        return this.app.brain.skills.all
            .filter(skill => !needle || skill.displayName.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle))
            .map(skill => ({
                id: skill.id,
                name: skill.displayName,
                description: skill.description
            }));
    }
}
