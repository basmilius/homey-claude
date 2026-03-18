<template>
    <Top
        :title="t('settings.title')"
        :subtitle="t('settings.subtitle')"/>

    <Form>
        <FormGroup :title="t('settings.api_key.title')">
            <template #before>
                <p :class="$style.description">{{ t('settings.api_key.description') }}</p>
            </template>

            <FormInput
                v-model="apiKey"
                type="password"
                :label="t('settings.api_key.title')"
                :placeholder="t('settings.api_key.placeholder')"/>
        </FormGroup>

        <FormGroup :title="t('settings.model.title')">
            <template #before>
                <p :class="$style.description">{{ t('settings.model.description') }}</p>
            </template>

            <label class="homey-form-label">{{ t('settings.model.title') }}</label>
            <select
                class="homey-form-select"
                v-model="defaultModel">
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
                <p :class="$style.description">{{ t('settings.max_tokens.description') }}</p>
            </template>

            <FormInput
                v-model="maxTokensStr"
                type="number"
                :label="t('settings.max_tokens.title')"
                placeholder="1024"/>
        </FormGroup>

        <FormGroup :title="t('settings.test.button')">
            <ButtonPrimary
                :disabled="isSaving || isTesting || !apiKey"
                :is-loading="isSaving"
                :label="isSaving ? '...' : t('settings.test.button')"
                @click="onSaveAndTest"/>

            <p
                v-if="testResult"
                :class="testResult.success ? $style.testSuccess : $style.testError">
                {{ testResult.message }}
            </p>
        </FormGroup>

        <FormGroup :title="t('settings.homey_mcp.title')">
            <template #before>
                <p :class="$style.description">{{ t('settings.homey_mcp.description') }}</p>
            </template>

            <template v-if="homeyMcpConnected">
                <p :class="$style.mcpConnected">✓ {{ t('settings.homey_mcp.connected') }}</p>

                <ButtonTransparent
                    :label="t('settings.homey_mcp.disconnect')"
                    @click="onHomeyMcpDisconnect"/>
            </template>

            <template v-else>
                <ButtonPrimary
                    :disabled="isConnecting"
                    :is-loading="isConnecting"
                    :label="isConnecting ? t('settings.homey_mcp.waiting') : t('settings.homey_mcp.connect')"
                    @click="onHomeyMcpConnect"/>

                <p
                    v-if="mcpError"
                    :class="$style.testError">
                    {{ mcpError }}
                </p>
            </template>
        </FormGroup>

        <FormGroup title="">
            <ButtonPrimary
                :disabled="isSaving"
                :is-loading="isSaving"
                :label="isSaving ? '...' : t('settings.save.button')"
                @click="onSave"/>

            <p
                v-if="saveResult"
                :class="saveResult.success ? $style.testSuccess : $style.testError">
                {{ saveResult.message }}
            </p>
        </FormGroup>
    </Form>
</template>

<script
    lang="ts"
    setup>
    import { onMounted, ref } from 'vue';
    import { ButtonPrimary, ButtonTransparent, Form, FormGroup, FormInput, Top } from './components';
    import { useTranslate } from './composables';

    const MODELS = [
        {id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5'},
        {id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6'},
        {id: 'claude-opus-4-6', name: 'Claude Opus 4.6'}
    ];

    const t = useTranslate();

    const apiKey = ref('');
    const defaultModel = ref('claude-haiku-4-5-20251001');
    const maxTokensStr = ref('1024');
    const isSaving = ref(false);
    const isTesting = ref(false);
    const isConnecting = ref(false);
    const homeyMcpConnected = ref(false);
    const testResult = ref<{ success: boolean; message: string } | null>(null);
    const saveResult = ref<{ success: boolean; message: string } | null>(null);
    const mcpError = ref<string | null>(null);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    onMounted(async () => {
        const [settings, mcpStatus] = await Promise.all([
            Homey.api<Settings>('GET', '/settings'),
            Homey.api<{ connected: boolean }>('GET', '/homey-oauth/status')
        ]);

        apiKey.value = settings.apiKey ?? '';
        defaultModel.value = settings.defaultModel ?? 'claude-haiku-4-5-20251001';
        maxTokensStr.value = String(settings.maxTokens ?? 1024);
        homeyMcpConnected.value = mcpStatus.connected;

        Homey.ready();
    });

    async function onSave(): Promise<void> {
        isSaving.value = true;
        saveResult.value = null;

        try {
            const maxTokens = parseInt(maxTokensStr.value, 10);

            await Promise.all([
                Homey.api('PUT', '/settings', {key: 'claude-api-key', value: apiKey.value}),
                Homey.api('PUT', '/settings', {key: 'claude-default-model', value: defaultModel.value}),
                ...(isNaN(maxTokens) || maxTokens <= 0 ? [] : [
                    Homey.api('PUT', '/settings', {key: 'claude-max-tokens', value: maxTokens})
                ])
            ]);

            saveResult.value = {success: true, message: t('settings.save.success')};
        } catch (err: any) {
            saveResult.value = {success: false, message: t('settings.save.error').replace('{{error}}', err?.message ?? 'Unknown error')};
        } finally {
            isSaving.value = false;
        }
    }

    async function onSaveAndTest(): Promise<void> {
        await onSave();

        if (!saveResult.value?.success) {
            return;
        }

        isTesting.value = true;
        testResult.value = null;
        saveResult.value = null;

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

    async function onHomeyMcpConnect(): Promise<void> {
        mcpError.value = null;
        isConnecting.value = true;

        try {
            const origin = encodeURIComponent(window.location.origin);
            const {authUrl} = await Homey.api<{ authUrl: string }>('GET', `/homey-oauth/auth-url?origin=${origin}`);

            // Homey.openURL() opens via the parent (non-sandboxed) frame, bypassing iframe sandbox restrictions
            Homey.openURL(authUrl);

            pollInterval = setInterval(async () => {
                try {
                    const status = await Homey.api<{ connected: boolean }>('GET', '/homey-oauth/status');

                    if (status.connected) {
                        homeyMcpConnected.value = true;
                        isConnecting.value = false;
                        stopPolling();
                    }
                } catch {
                    // ignore poll errors
                }
            }, 2000);

            // Stop polling after 5 minutes
            setTimeout(() => {
                if (isConnecting.value) {
                    isConnecting.value = false;
                    stopPolling();
                    mcpError.value = t('settings.homey_mcp.error').replace('{{error}}', 'Timed out');
                }
            }, 5 * 60 * 1000);
        } catch (err: any) {
            isConnecting.value = false;
            mcpError.value = t('settings.homey_mcp.error').replace('{{error}}', err?.message ?? 'Unknown error');
        }
    }

    async function onHomeyMcpDisconnect(): Promise<void> {
        await Homey.api('DELETE', '/homey-oauth/disconnect');
        homeyMcpConnected.value = false;
    }

    function stopPolling(): void {
        if (pollInterval !== null) {
            clearInterval(pollInterval);
            pollInterval = null;
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

    .testSuccess,
    .mcpConnected {
        color: #28a745;
        margin-top: 8px;
    }

    .testError {
        color: #dc3545;
        margin-top: 8px;
    }
</style>
