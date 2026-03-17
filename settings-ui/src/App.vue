<template>
    <Top
        :title="t('settings.title')"
        :subtitle="t('settings.subtitle')"/>

    <Form>
        <FormGroup :title="t('settings.api_key.title')">
            <template #before>
                <p class="description">{{ t('settings.api_key.description') }}</p>
            </template>

            <FormInput
                v-model="apiKey"
                type="password"
                :label="t('settings.api_key.title')"
                :placeholder="t('settings.api_key.placeholder')"
                @change="onSaveApiKey"/>
        </FormGroup>

        <FormGroup :title="t('settings.model.title')">
            <template #before>
                <p class="description">{{ t('settings.model.description') }}</p>
            </template>

            <label class="homey-form-label">{{ t('settings.model.title') }}</label>
            <select
                class="homey-form-select"
                v-model="defaultModel"
                @change="onSaveModel">
                <option
                    v-for="model in MODELS"
                    :key="model.id"
                    :value="model.id">
                    {{ model.name }}
                </option>
            </select>
        </FormGroup>

        <FormGroup :title="t('settings.max_tokens.title')">
            <template #before>
                <p class="description">{{ t('settings.max_tokens.description') }}</p>
            </template>

            <FormInput
                v-model="maxTokensStr"
                type="number"
                :label="t('settings.max_tokens.title')"
                placeholder="1024"
                @change="onSaveMaxTokens"/>
        </FormGroup>

        <FormGroup :title="t('settings.test.button')">
            <ButtonPrimary
                :disabled="isTesting || !apiKey"
                :label="isTesting ? '...' : t('settings.test.button')"
                @click="onTestConnection"/>

            <p
                v-if="testResult"
                :class="testResult.success ? 'test-success' : 'test-error'">
                {{ testResult.message }}
            </p>
        </FormGroup>
    </Form>
</template>

<script
    lang="ts"
    setup>
    import {onMounted, ref} from 'vue';
    import {ButtonPrimary, Form, FormGroup, FormInput, Top} from './components';
    import {useTranslate} from './composables';

    const MODELS = [
        {id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5'},
        {id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6'},
        {id: 'claude-opus-4-6', name: 'Claude Opus 4.6'}
    ];

    const t = useTranslate();

    const apiKey = ref('');
    const defaultModel = ref('claude-haiku-4-5-20251001');
    const maxTokensStr = ref('1024');
    const isTesting = ref(false);
    const testResult = ref<{success: boolean; message: string} | null>(null);

    onMounted(async () => {
        const settings = await Homey.api<Settings>('GET', '/settings');

        apiKey.value = settings.apiKey ?? '';
        defaultModel.value = settings.defaultModel ?? 'claude-haiku-4-5-20251001';
        maxTokensStr.value = String(settings.maxTokens ?? 1024);

        Homey.ready();
    });

    async function onSaveApiKey(): Promise<void> {
        await Homey.api('PUT', '/settings', {key: 'claude-api-key', value: apiKey.value});
        testResult.value = null;
    }

    async function onSaveModel(): Promise<void> {
        await Homey.api('PUT', '/settings', {key: 'claude-default-model', value: defaultModel.value});
    }

    async function onSaveMaxTokens(): Promise<void> {
        const value = parseInt(maxTokensStr.value, 10);

        if (!isNaN(value) && value > 0) {
            await Homey.api('PUT', '/settings', {key: 'claude-max-tokens', value});
        }
    }

    async function onTestConnection(): Promise<void> {
        await onSaveApiKey();

        isTesting.value = true;
        testResult.value = null;

        try {
            await Homey.api('POST', '/test-connection', {});
            testResult.value = {success: true, message: t('settings.test.success')};
        } catch (err: any) {
            const message = t('settings.test.error').replace('{{error}}', err?.message ?? 'Unknown error');
            testResult.value = {success: false, message};
        } finally {
            isTesting.value = false;
        }
    }

    type Settings = {
        apiKey: string | null;
        defaultModel: string | null;
        maxTokens: number | null;
    };
</script>

<style
    lang="scss"
    module>
    .description {
        color: #666;
        font-size: 0.875rem;
        margin: 0 0 8px;
    }

    .test-success {
        color: #28a745;
        margin-top: 8px;
    }

    .test-error {
        color: #dc3545;
        margin-top: 8px;
    }
</style>
