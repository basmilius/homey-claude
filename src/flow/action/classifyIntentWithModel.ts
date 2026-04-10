import { action, FlowActionEntity } from '@basmilius/homey-common';
import type { ClaudeApp } from '../../types';

const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier. Given the user's text and a list of possible intents, determine which intent best matches. Respond ONLY with valid JSON in this exact format:
{"intent": "<exact intent from list or 'unknown'>", "confidence": "<high|medium|low>", "parameters": "<extracted relevant parameters as text, or empty string>"}

Rules:
- The "intent" value MUST be one of the provided intents exactly as written, or "unknown" if none match.
- The "confidence" value MUST be one of: "high", "medium", or "low".
- The "parameters" value should contain any relevant extracted details from the text (e.g. room names, device names, values).
- Do NOT include any text outside the JSON object.`;

/**
 * Action: Classify text into one of the user-defined intents, with a specific model chosen per flow card.
 */
@action('classify_intent_with_model')
export default class extends FlowActionEntity<ClaudeApp, Args, never, Result> {
    async onRun(args: Args): Promise<Result> {
        const prompt = `Text to classify: "${args.text}"\n\nPossible intents: ${args.intents}`;

        const {answer, model} = await this.app.brain.claude.ask(
            prompt,
            CLASSIFY_SYSTEM_PROMPT,
            args.model
        );

        const parsed = parseClassification(answer);

        await this.app.triggerResponseReady(answer, model);

        return {
            intent: parsed.intent,
            confidence: parsed.confidence,
            parameters: parsed.parameters,
            model_used: model
        };
    }
}

/**
 * Parses the JSON classification response from Claude.
 * Falls back to safe defaults if parsing fails.
 */
function parseClassification(answer: string): Classification {
    try {
        const json = JSON.parse(answer.trim());

        return {
            intent: typeof json.intent === 'string' ? json.intent : 'unknown',
            confidence: ['high', 'medium', 'low'].includes(json.confidence) ? json.confidence : 'low',
            parameters: typeof json.parameters === 'string' ? json.parameters : ''
        };
    } catch {
        return {
            intent: 'unknown',
            confidence: 'low',
            parameters: ''
        };
    }
}

type Args = {
    readonly text: string;
    readonly intents: string;
    readonly model: string;
};

type Result = {
    readonly intent: string;
    readonly confidence: string;
    readonly parameters: string;
    readonly model_used: string;
};

type Classification = {
    readonly intent: string;
    readonly confidence: string;
    readonly parameters: string;
};
