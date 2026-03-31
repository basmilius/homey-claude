import { Shortcuts } from '@basmilius/homey-common';
import type { ClaudeApp } from '../types';
import CallbackServer from './callbackServer';
import Claude from './claude';
import Conversation from './conversation';
import HomeyMcp from './homeyMcp';
import Scheduler from './scheduler';

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

    get callbackServer(): CallbackServer {
        return this.#callbackServer;
    }

    get homeyMcp(): HomeyMcp {
        return this.#homeyMcp;
    }

    get scheduler(): Scheduler {
        return this.#scheduler;
    }

    readonly #callbackServer: CallbackServer;
    readonly #claude: Claude;
    readonly #conversation: Conversation;
    readonly #homeyMcp: HomeyMcp;
    readonly #scheduler: Scheduler;

    constructor(app: ClaudeApp) {
        super(app);

        this.#callbackServer = new CallbackServer(app);
        this.#claude = new Claude(app);
        this.#conversation = new Conversation(app);
        this.#homeyMcp = new HomeyMcp(app);
        this.#scheduler = new Scheduler(app);
    }
}
