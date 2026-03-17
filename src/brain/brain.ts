import {Shortcuts} from '@basmilius/homey-common';
import type {ClaudeApp} from '../types';
import Claude from './claude';
import Conversation from './conversation';

/**
 * Orchestrates all brain modules for the Claude app.
 */
export default class Brain extends Shortcuts<ClaudeApp> {
    get claude(): Claude {
        return this.#claude;
    }

    get conversation(): Conversation {
        return this.#conversation;
    }

    readonly #claude: Claude;
    readonly #conversation: Conversation;

    constructor(app: ClaudeApp) {
        super(app);

        this.#claude = new Claude(app);
        this.#conversation = new Conversation(app);
    }
}
