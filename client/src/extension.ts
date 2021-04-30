import {
	workspace,
	ExtensionContext,
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	const extensionConfig = workspace.getConfiguration("idris2-lsp");
	const command: string = extensionConfig.get("path") || "";
	const serverOptions: ServerOptions = { 
		command: command,
	};
	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'idris' }],
	};
	client = new LanguageClient(
		'idris2-lsp',
		'Idris 2 LSP Client',
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
