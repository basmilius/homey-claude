import Anthropic, { toFile, type Uploadable } from '@anthropic-ai/sdk';
import { Shortcuts } from '@basmilius/homey-common';
import { MAX_SKILL_DESCRIPTION_LENGTH, MAX_SKILL_NAME_LENGTH, SETTING_API_KEY, SETTING_SKILLS } from '../const';
import type { ClaudeApp, SkillInput, StoredSkill } from '../types';

/**
 * Manages the custom skills that live in the Anthropic workspace. Each skill is a single
 * SKILL.md; the app keeps a local copy of its fields so the settings page and the flow card
 * autocomplete do not need an API call.
 */
export default class Skills extends Shortcuts<ClaudeApp> {
    /**
     * Returns every skill known to the app, sorted by display name.
     */
    get all(): StoredSkill[] {
        const stored = this.settings.get(SETTING_SKILLS) as StoredSkill[] | null ?? [];

        return [...stored].sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    constructor(app: ClaudeApp) {
        super(app);
    }

    /**
     * Uploads a new skill and stores it.
     */
    async create(input: SkillInput): Promise<StoredSkill> {
        const validated = validate(input);
        const name = this.#uniqueName(validated.displayName);

        const skill = await this.#client().skills.create({
            display_name: validated.displayName,
            files: [await skillFile(name, validated)]
        });

        const stored: StoredSkill = {...validated, id: skill.id, name, updatedAt: new Date().toISOString()};
        this.#store([...this.all, stored]);

        return stored;
    }

    /**
     * Returns the skill with the given id, or undefined when the app does not know it.
     */
    find(id: string): StoredSkill | undefined {
        return this.all.find(skill => skill.id === id);
    }

    /**
     * Returns the skill with the given id and fails when the app does not know it.
     */
    require(id: string): StoredSkill {
        const skill = this.find(id);

        if (!skill) {
            throw new Error('Skill not found.');
        }

        return skill;
    }

    /**
     * Deletes a skill. A skill that is already gone upstream is still removed locally.
     */
    async remove(id: string): Promise<void> {
        const existing = this.require(id);

        try {
            await this.#client().skills.delete(existing.id);
        } catch (err) {
            if (!(err instanceof Anthropic.NotFoundError)) {
                throw err;
            }
        }

        this.#store(this.all.filter(skill => skill.id !== id));
    }

    /**
     * Uploads the edited skill as a new version. The frontmatter name cannot change, because
     * a version has to keep the name of the skill it belongs to.
     */
    async update(id: string, input: SkillInput): Promise<StoredSkill> {
        const existing = this.require(id);
        const validated = validate(input);

        await this.#client().skills.versions.create(existing.id, {
            files: [await skillFile(existing.name, validated)]
        });

        const stored: StoredSkill = {...existing, ...validated, updatedAt: new Date().toISOString()};
        this.#store(this.all.map(skill => skill.id === id ? stored : skill));

        return stored;
    }

    #client(): Anthropic {
        const apiKey = this.settings.get(SETTING_API_KEY) as string | null;

        if (!apiKey) {
            throw new Error('Claude API key is not configured. Please set your API key in the app settings.');
        }

        return new Anthropic({apiKey});
    }

    #store(skills: StoredSkill[]): void {
        this.settings.set(SETTING_SKILLS, skills);
    }

    /**
     * Derives a frontmatter name from the display name and keeps it unique within the app, so
     * two skills never end up sharing a container directory.
     */
    #uniqueName(displayName: string): string {
        const base = slugify(displayName);
        const taken = new Set(this.all.map(skill => skill.name));

        if (!taken.has(base)) {
            return base;
        }

        for (let suffix = 2; ; ++suffix) {
            const candidate = `${base.slice(0, MAX_SKILL_NAME_LENGTH - 4)}-${suffix}`;

            if (!taken.has(candidate)) {
                return candidate;
            }
        }
    }
}

/**
 * Builds the SKILL.md upload. The path puts the file at the root of a single folder, which is
 * where the API expects it.
 */
async function skillFile(name: string, input: SkillInput): Promise<Uploadable> {
    const content = `---\nname: ${name}\ndescription: ${yamlString(input.description)}\n---\n\n${input.instructions}\n`;

    return toFile(Buffer.from(content, 'utf8'), `${name}/SKILL.md`, {type: 'text/markdown'});
}

/**
 * Turns a display name into a frontmatter name: lowercase letters, numbers and hyphens only.
 * The API rejects the words `anthropic` and `claude`, so they are dropped rather than escaped.
 */
function slugify(displayName: string): string {
    const slug = displayName
        .toLowerCase()
        .replace(/anthropic|claude/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SKILL_NAME_LENGTH)
        .replace(/-+$/, '');

    return slug || 'skill';
}

/**
 * Quotes a value the way YAML wants it, so a colon or a line break in the description cannot
 * break the frontmatter. A YAML double-quoted scalar takes the same escapes as a JSON string.
 */
function yamlString(value: string): string {
    return JSON.stringify(value);
}

/**
 * Rejects input the API would reject, so the error names the field instead of arriving as a 400.
 */
function validate(input: SkillInput): SkillInput {
    const displayName = input.displayName?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    const instructions = input.instructions?.trim() ?? '';

    if (!displayName) {
        throw new Error('A skill needs a name.');
    }

    if (!description) {
        throw new Error('A skill needs a description. Claude uses it to decide when the skill applies.');
    }

    if (description.length > MAX_SKILL_DESCRIPTION_LENGTH) {
        throw new Error(`The description cannot be longer than ${MAX_SKILL_DESCRIPTION_LENGTH} characters.`);
    }

    if (!instructions) {
        throw new Error('A skill needs instructions.');
    }

    return {displayName, description, instructions};
}
