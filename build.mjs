import { build } from 'esbuild';

/**
 * Bundles the app into self-contained CommonJS files inside `.homeybuild/`.
 *
 * Three outputs:
 * 1. `.homeybuild/anthropic.js` — the Anthropic SDK, inlined and minified once.
 * 2. `.homeybuild/app.js`       — `app.ts` + everything under `src/`, with the
 *                                 SDK redirected to sibling `./anthropic.js`.
 * 3. `.homeybuild/api.js`       — `api.ts`, same SDK redirect.
 *
 * Runtime externals (not bundled):
 * - `homey`: provided by the Homey runtime at app load time.
 * - `@basmilius/homey-common`: already pre-bundled and drives the decorator-
 *   based flow registry; leaving it external avoids any risk of re-bundling
 *   its decorator machinery.
 */
const runtimeExternal = [
    'homey',
    '@basmilius/homey-common'
];

const commonOptions = {
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    // Source maps add ~8 MB to the shipped app for minimal debugging value.
    sourcemap: false,
    // Minify only identifiers/whitespace: keeps stack traces readable while
    // cutting bundle size by roughly half.
    minifyIdentifiers: true,
    minifyWhitespace: true,
    minifySyntax: true,
    keepNames: true,
    legalComments: 'none',
    logLevel: 'info'
};

/**
 * Redirects `@anthropic-ai/sdk` imports in the entry bundles to the shared
 * sibling `./anthropic.js`, so the SDK ships exactly once instead of being
 * duplicated across `app.js` and `api.js`.
 */
const redirectAnthropicSdk = {
    name: 'redirect-anthropic-sdk',
    setup(pluginBuild) {
        pluginBuild.onResolve({filter: /^@anthropic-ai\/sdk$/}, () => ({
            path: './anthropic',
            external: true
        }));
    }
};

const sdkResult = await build({
    ...commonOptions,
    stdin: {
        contents: `module.exports = require('@anthropic-ai/sdk');`,
        loader: 'js',
        resolveDir: '.'
    },
    outfile: '.homeybuild/anthropic.js',
    external: runtimeExternal
});

const mainResult = await build({
    ...commonOptions,
    entryPoints: [
        'app.ts',
        'api.ts'
    ],
    outdir: '.homeybuild',
    external: runtimeExternal,
    plugins: [redirectAnthropicSdk]
});

const totalWarnings = sdkResult.warnings.length + mainResult.warnings.length;

if (totalWarnings > 0) {
    console.warn(`Bundled with ${totalWarnings} warning(s).`);
}
