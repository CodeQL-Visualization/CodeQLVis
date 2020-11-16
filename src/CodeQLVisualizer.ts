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

export const CodeQLVis = "CodeQLVis";

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

    constructor() {
        //set up the webview server...
        const app = express();
        app.use(serveStatic(config.disPath));
        this.server = app.listen();
        console.log("Starting the CodeQLVis Webview server on port %d...\n", this.port);
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

