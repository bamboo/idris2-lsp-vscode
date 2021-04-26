import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	const extensionConfig = workspace.getConfiguration("idris2-lsp")
	let command: string = extensionConfig.get("path") || ""
	let serverOptions: ServerOptions = {
		run: { command: command, },
		debug: { command: command, }
	};
	let clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'idris' }],
		synchronize: {
			// fileEvents: workspace.createFileSystemWatcher('**/.idr')
		}
	};
	client = new LanguageClient(
		'idris2-lsp',
		'Idris 2 Language Server',
		serverOptions,
		clientOptions
	);
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
