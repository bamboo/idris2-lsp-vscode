import { spawn } from 'child_process';
import {
  workspace,
  ExtensionContext,
  window,
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

export function activate(_context: ExtensionContext) {
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
    stderr.on('data', data => debugChannel.append(data));

    resolve({
      writer: serverProcess.stdin,
      reader: Readable.from(sanitize(serverProcess.stdout)),
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
 * Removes spurious content from the given [source], anything between proper
 * [LSP messages](https://microsoft.github.io/language-server-protocol/specifications/specification-3-14/)
 * is discarded.
 * 
 * This is necessary because the Idris 2 core writes error messages directly to stdout.
 *
 * @param source idris2-lsp stdout
 */
async function* sanitize(source: Readable) {

  let waitingFor = 0;
  let chunks = [];

  for await (const chunk of source) {
    if (waitingFor > 0) {
      const newChunk = chunk.length <= waitingFor
        ? chunk
        : chunk.subarray(0, waitingFor); // ignore anything after the expected content length

      waitingFor -= newChunk.length;

      yield newChunk;
      continue;
    }

    chunks.push(chunk);

    const pending = Buffer.concat(chunks);
    const headerBegin = pending.indexOf('Content-Length: ');
    if (headerBegin >= 0) {
      const lengthBegin = headerBegin + 'Content-Length: '.length;
      const separatorIndex = pending.indexOf('\r\n\r\n', lengthBegin);
      if (separatorIndex > lengthBegin) {
        // Found the header?
        const lengthStr = pending.subarray(lengthBegin, separatorIndex).toString('utf-8');
        if (lengthStr.match(/^\d+$/)) {
          const expectedLength = Number.parseInt(lengthStr);
          const headerSize = separatorIndex + 4 - headerBegin;
          const newChunk = pending.subarray(headerBegin, headerBegin + headerSize + expectedLength);

          waitingFor = headerSize + expectedLength - newChunk.length;
          chunks = [];

          yield newChunk;
          continue;
        }
      }
    }

    // Reuse concat result
    chunks = [pending];
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