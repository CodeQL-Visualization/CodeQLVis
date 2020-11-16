import { window, ViewColumn, WebviewPanel } from "vscode";
import { Disposable } from "@hediet/std/disposable";
import { AddressInfo } from "net";
import * as http from "http";
import * as express from "express";
import * as serveStatic from "serve-static";
import * as config from "./Config";
import cryptoRandomString = require("crypto-random-string");
import WebSocket = require("ws");
import { URLSearchParams } from "url";
import { create } from "domain";

export const codeQLVis = "CodeQLVis";

// fake class
export class CodeQLVisualizerWebview {
    constructor(private readonly webviewPanel: WebviewPanel) {}
}

export class CodeQLVisualizer {
    private readonly openedWebViews = new Map<WebviewPanel, CodeQLVisualizerWebview>(); //list of all views
    public readonly dispose = Disposable.fn();

    // webview server stuff
    private readonly server : http.Server;
    public readonly secret = cryptoRandomString({ length: 30 });
    private readonly openedWebviews = new Map<
		WebviewPanel,
		CodeQLVisualizerWebview
	>();

    private initializeView(webviewPanel: WebviewPanel) {
		webviewPanel.webview.html = "<html><head></head><body><h1>hello world from CodeQL Visualizer</hello></body></html>";
		const view = new CodeQLVisualizerWebview(webviewPanel);
		this.openedWebviews.set(webviewPanel, view);
		webviewPanel.onDidDispose(() => {
			this.openedWebviews.delete(webviewPanel);
		});
    }
    
    private restore(webviewPanel: WebviewPanel) {
		this.initializeView(webviewPanel);
	}

    constructor() {
        //set up the webview server...
        const app = express();
        app.use(serveStatic(config.disPath));
        this.server = app.listen();
        console.log("Starting the CodeQLVis Webview server on port %d...\n", this.port);

        this.dispose.track(
            window.registerWebviewPanelSerializer(codeQLVis, {
				deserializeWebviewPanel: async (panel, state) => {
					this.restore(panel);
				},
			})
        );

        this.dispose.track({
			dispose: () => {
				for (const panel of this.openedWebviews.keys()) {
					panel.dispose();
				}
			},
        });
        
        this.createNew();
    }

    public createNew() {
		const webviewPanel = window.createWebviewPanel(
			codeQLVis,
			"CodeQL Visualizer",
			ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				portMapping: [
					{
						webviewPort: this.port,
						extensionHostPort: this.port,
					},
				],
			}
		);

		this.initializeView(webviewPanel);
	}

    public getWebviewPageUrl() {

        const params: Record<string, string> = {
			serverPort: this.port.toString(),
			serverSecret: this.secret,
			mode: "standalone",
			theme: "dark",
        };
        
        return `http://localhost:${this.port}/index.html?${new URLSearchParams(
			params
		).toString()}`;
    }

    public get publicPath(): string {
        return `http://localhost:${this.port}/`; 
    }

    public get webviewBundleUrl(): string {
		return `${this.publicPath}main.js`;
	}

    public get port(): number {
		const httpPort = (this.server.address() as AddressInfo).port;
		return httpPort;
	}

    
}

// function getDebugVisualizerWebviewHtml(
// 	server: WebviewServer
// ) {
// 	const isDev = !!process.env.USE_DEV_UI;
// 	return `
//         <html>
// 			<head>
// 			<meta charset="UTF-8">
// 			<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'; worker-src * data: blob: data: 'unsafe-inline' 'unsafe-eval'; font-src * 'unsafe-inline' 'unsafe-eval' 'self' data: blob:;">
//             <style>
//                 html { height: 100%; width: 100%; padding: 0; margin: 0; }
//                 body { height: 100%; width: 100%; padding: 0; margin: 0; }
// 				iframe { height: 100%; width: 100%; padding: 0; margin: 0; border: 0; display: block; }
//             </style>
//             </head>
// 			<body>
// 				<script>
// 					Object.assign(window, ${JSON.stringify({
// 						webviewData: {
// 							serverSecret: server.secret,
// 							serverPort: server.port,
// 							publicPath: server.publicPath,
// 							theme: "dark",
// 						},
// 					})};
// 					const api = window.VsCodeApi = acquireVsCodeApi();
// 					window.addEventListener('message', event => {
// 						if (event.source === window.frames[0]) {
// 							if (event.data.command === "setState") {
// 								console.log("setState", event.data.state);
// 								api.setState(event.data.state);
// 							}
// 							if (event.data.command === "getState") {
// 								console.log("getState, sent ", api.getState());
// 								window.frames[0].postMessage({ command: "getStateResult", state: api.getState() }, "*");
// 							}
// 						}
// 					});
// 				</script>
				
// 				${
// 					isDev
// 						? `<iframe sandbox="allow-top-navigation allow-scripts allow-same-origin allow-popups allow-pointer-lock allow-forms" src="${server.getWebviewPageUrl(
// 								{
// 									mode: "webviewIFrame",
// 									expression: initialExpression,
// 								}
// 						  )}"></iframe>`
// 						: `<script type="text/javascript" src="${server.webviewBundleUrl}"></script>`
// 				}
//             </body>
//         </html>
//     `;
// }