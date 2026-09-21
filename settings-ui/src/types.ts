export type Model = {
    readonly id: string;
    readonly name: string;
};

export type Skill = {
    readonly id: string;
    readonly displayName: string;
    readonly description: string;
    readonly instructions: string;
    readonly updatedAt: string;
};

/** A skill being edited. `id` is null while it has not been created yet. */
export type SkillDraft = {
    id: string | null;
    displayName: string;
    description: string;
    instructions: string;
};
