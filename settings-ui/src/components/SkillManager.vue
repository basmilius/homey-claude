<template>
    <FormGroup :title="t('settings.skills.title')">
        <template #before>
            <p :class="$style.description">{{ t('settings.skills.description') }}</p>
        </template>

        <template v-if="draft">
            <FormInput
                v-model="draft.displayName"
                :disabled="isBusy"
                :label="t('settings.skills.name')"/>

            <FormTextarea
                v-model="draft.description"
                :disabled="isBusy"
                :label="t('settings.skills.summary')"
                :placeholder="t('settings.skills.summary_placeholder')"
                :rows="2"/>

            <FormTextarea
                v-model="draft.instructions"
                :disabled="isBusy"
                :label="t('settings.skills.instructions')"
                :placeholder="t('settings.skills.instructions_placeholder')"
                :rows="10"/>

            <div :class="$style.actions">
                <ButtonPrimary
                    :disabled="isBusy"
                    :is-loading="isBusy"
                    :label="t('settings.skills.save')"
                    @click="onSubmit"/>

                <ButtonTransparent
                    :label="t('settings.skills.cancel')"
                    @click="onCancel"/>
            </div>
        </template>

        <template v-else>
            <p
                v-if="skills.length === 0"
                :class="$style.empty">
                {{ t('settings.skills.empty') }}
            </p>

            <ul
                v-else
                :class="$style.list">
                <li
                    v-for="skill in skills"
                    :key="skill.id"
                    :class="$style.item">
                    <div :class="$style.itemText">
                        <strong>{{ skill.displayName }}</strong>
                        <span :class="$style.itemDescription">{{ skill.description }}</span>
                    </div>

                    <div :class="$style.actions">
                        <ButtonTransparent
                            :label="t('settings.skills.edit')"
                            @click="onEdit(skill)"/>

                        <ButtonTransparent
                            :label="pendingDeleteId === skill.id ? t('settings.skills.delete_confirm') : t('settings.skills.delete')"
                            @click="onDelete(skill)"/>
                    </div>
                </li>
            </ul>

            <ButtonTransparent
                :label="t('settings.skills.add')"
                @click="onAdd"/>
        </template>

        <p
            v-if="error"
            :class="$style.error">
            {{ error }}
        </p>
    </FormGroup>
</template>

<script
    lang="ts"
    setup>
    import { onMounted, ref } from 'vue';
    import ButtonPrimary from './ButtonPrimary.vue';
    import ButtonTransparent from './ButtonTransparent.vue';
    import FormGroup from './FormGroup.vue';
    import FormInput from './FormInput.vue';
    import FormTextarea from './FormTextarea.vue';
    import { useTranslate } from '../composables';
    import type { Skill, SkillDraft } from '../types';

    const t = useTranslate();

    const skills = ref<Skill[]>([]);
    const draft = ref<SkillDraft | null>(null);
    const pendingDeleteId = ref<string | null>(null);
    const isBusy = ref(false);
    const error = ref<string | null>(null);

    onMounted(async () => {
        try {
            skills.value = await Homey.api<Skill[]>('GET', '/skills');
        } catch (err: any) {
            error.value = failure(err);
        }
    });

    function onAdd(): void {
        error.value = null;
        pendingDeleteId.value = null;
        draft.value = {id: null, displayName: '', description: '', instructions: ''};
    }

    function onCancel(): void {
        draft.value = null;
        error.value = null;
    }

    async function onDelete(skill: Skill): Promise<void> {
        if (pendingDeleteId.value !== skill.id) {
            pendingDeleteId.value = skill.id;
            return;
        }

        pendingDeleteId.value = null;
        error.value = null;

        try {
            await Homey.api('DELETE', `/skills/${skill.id}`);
            skills.value = skills.value.filter(entry => entry.id !== skill.id);
        } catch (err: any) {
            error.value = failure(err);
        }
    }

    function onEdit(skill: Skill): void {
        error.value = null;
        pendingDeleteId.value = null;
        draft.value = {...skill};
    }

    async function onSubmit(): Promise<void> {
        const editing = draft.value;

        if (!editing) {
            return;
        }

        isBusy.value = true;
        error.value = null;

        const body = {
            displayName: editing.displayName,
            description: editing.description,
            instructions: editing.instructions
        };

        try {
            const saved = editing.id === null
                ? await Homey.api<Skill>('POST', '/skills', body)
                : await Homey.api<Skill>('PUT', `/skills/${editing.id}`, body);

            skills.value = editing.id === null
                ? [...skills.value, saved]
                : skills.value.map(entry => entry.id === saved.id ? saved : entry);

            draft.value = null;
        } catch (err: any) {
            error.value = failure(err);
        } finally {
            isBusy.value = false;
        }
    }

    function failure(err: any): string {
        return t('settings.skills.error').replace('{{error}}', err?.message ?? 'Unknown error');
    }
</script>

<style
    lang="scss"
    module>
    .description {
        color: #666;
        font-size: 0.875rem;
        margin: 0 0 8px;
    }

    .empty {
        color: #666;
        font-size: 0.875rem;
        margin: 0 0 8px;
    }

    .error {
        color: #dc3545;
        margin-top: 8px;
    }

    .list {
        list-style: none;
        margin: 0 0 8px;
        padding: 0;
    }

    .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;

        & + & {
            border-top: 1px solid #eee;
        }
    }

    .itemText {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .itemDescription {
        color: #666;
        font-size: 0.875rem;
    }

    .actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }
</style>
