import { Shortcuts } from '@basmilius/homey-common';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ClaudeApp } from '../types';

/**
 * Manages a temporary HTTP server that receives the OAuth authorization code callback.
 * The server starts on a random port, handles one request, and shuts itself down.
 */
export default class CallbackServer extends Shortcuts<ClaudeApp> {
    #server: http.Server | null = null;

    constructor(app: ClaudeApp) {
        super(app);
    }

    /**
     * Starts the callback server and returns the redirect URI.
     * Any previously running server is closed first.
     */
    start(hostname: string, onCallback: CallbackHandler): Promise<string> {
        this.stop();

        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                const url = new URL(req.url ?? '/', 'http://localhost');
                const code = url.searchParams.get('code');
                const state = url.searchParams.get('state');

                if (!code || !state) {
                    res.writeHead(400, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(callbackHtml(false, 'Missing code or state.'));
                    this.stop();
                    return;
                }

                try {
                    await onCallback(code, state);
                    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(callbackHtml(true));
                } catch (err) {
                    res.writeHead(500, {'Content-Type': 'text/html; charset=utf-8'});
                    res.end(callbackHtml(false, String(err)));
                } finally {
                    this.stop();
                }
            });

            const timeout = setTimeout(() => this.stop(), 10 * 60 * 1000);
            server.on('close', () => clearTimeout(timeout));
            server.on('error', reject);

            server.listen(0, '0.0.0.0', () => {
                this.#server = server;
                const port = (server.address() as AddressInfo).port;
                resolve(`http://${hostname}:${port}/callback`);
            });
        });
    }

    /**
     * Stops the callback server if it is running.
     */
    stop(): void {
        this.#server?.close();
        this.#server = null;
    }
}

function callbackHtml(success: boolean, errorMessage?: string): string {
    if (success) {
        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Claude for Homey</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.1);max-width:360px}
h2{color:#28a745;margin:0 0 12px}p{color:#555;margin:0}</style></head>
<body><div class="card"><h2>&#10003; Connected!</h2><p>Authentication successful. You can close this tab.</p></div>
<script>setTimeout(()=>window.close(),2000)</script></body></html>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Claude for Homey</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f5f5}
.card{background:#fff;border-radius:12px;padding:40px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.1);max-width:360px}
h2{color:#dc3545;margin:0 0 12px}p{color:#555;margin:0;word-break:break-word}</style></head>
<body><div class="card"><h2>&#10007; Authentication failed</h2><p>${errorMessage ?? 'An unknown error occurred.'}</p></div></body></html>`;
}

export type CallbackHandler = (code: string, state: string) => Promise<void>;
