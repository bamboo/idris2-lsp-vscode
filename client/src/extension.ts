import { spawn } from 'child_process';
import {
  workspace,
  ExtensionContext,
  window,
  OutputChannel,
} from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
} from 'vscode-languageclient/node';

import { Readable } from 'stream';

let client: LanguageClient;

const clientName = 'Idris 2 LSP Client';

export function activate(context: ExtensionContext) {
  const extensionConfig = workspace.getConfiguration("idris2-lsp");
  const command: string = extensionConfig.get("path") || "";
  const debugChannel = window.createOutputChannel(clientName + ' Debug');
  const serverOptions: ServerOptions = () => new Promise<StreamInfo>((resolve, reject) => {
    const serverProcess = spawn(command, [], { cwd: rootPath() });
    if (!serverProcess || !serverProcess.pid) {
      return reject(`Launching server using command ${command} failed.`);
    }

    const stderr = serverProcess.stderr;
    stderr.setEncoding('utf-8');
    stderr.on('data', data => {
      return debugChannel.append(data);
    });

    resolve({
      writer: serverProcess.stdin,
      reader: Readable.from(filterMessages(serverProcess.stdout)),
    });
  });
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'idris' }],
  };
  client = new LanguageClient(
    'idris2-lsp',
    clientName,
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

/**
 * Removes spurious content from the given [source]. This is necessary because
 * the Idris 2 core writes error messages directly to stdout.
 *
 * @param source idris2-lsp stdout
 */
async function* filterMessages(source: Readable) {

  let waitingFor = 0;
  let acc = [];

  for await (const buffer of source) {
    if (waitingFor > 0) {
      const newBuffer = buffer.length == waitingFor
        ? buffer
        : buffer.subarray(0, waitingFor);
      yield newBuffer;
      waitingFor -= newBuffer.length;
      continue;
    }

    acc.push(buffer);

    const pending = Buffer.concat(acc);
    const start = pending.indexOf('Content-Length: ');
    if (start >= 0) {
      const lengthStart = start + 'Content-Length: '.length;
      const end = pending.indexOf('\r\n\r\n', lengthStart);
      if (end > start) {
        // found the header
        const headerSize = end + 4 - start;
        const lengthStr = pending.subarray(lengthStart, end).toString('utf-8');
        const expectedLength = Number.parseInt(lengthStr);
        const message = pending.subarray(start, start + headerSize + expectedLength);
        yield message;

        waitingFor = expectedLength + headerSize - message.length;
        acc = [];

        continue;
      }
    }
  }
}

function rootPath(): string | undefined {
  const folders = workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  const folder = folders[0];
  if (folder.uri.scheme === 'file') {
    return folder.uri.fsPath;
  }
  return undefined;
}