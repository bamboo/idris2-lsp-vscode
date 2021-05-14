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

const baseName = 'Idris 2 LSP';

export function activate(context: ExtensionContext) {
  const extensionConfig = workspace.getConfiguration("idris2-lsp");
  const command: string = extensionConfig.get("path") || "";
  const debugChannel = window.createOutputChannel(baseName + ' Server');
  const serverOptions: ServerOptions = () => new Promise<StreamInfo>((resolve, reject) => {
    const serverProcess = spawn(command, [], { cwd: rootPath() });
    if (!serverProcess || !serverProcess.pid) {
      return reject(`Launching server using command ${command} failed.`);
    }

    context.subscriptions.push({
      dispose: () => {
        sendExitCommandTo(serverProcess.stdin);
      }
    });

    const stderr = serverProcess.stderr;
    stderr.setEncoding('utf-8');
    stderr.on('data', data => debugChannel.append(data));

    resolve({
      writer: serverProcess.stdin,
      reader: sanitized(serverProcess.stdout),
      detached: true // let us handle the disposal of the server
    });
  });
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'idris' }],
  };
  const client = new LanguageClient(
    'idris2-lsp',
    baseName + ' Client',
    serverOptions,
    clientOptions
  );
  client.start();
  context.subscriptions.push({
    dispose: () => {
      client.stop();
    }
  });
}

function sendExitCommandTo(server: NodeJS.WritableStream) {
  const command = '{"jsonrpc":"2.0","id":1,"method":"exit"}';
  server.write(`Content-Length: ${command.length}\r\n\r\n`);
  server.write(command);
}

/**
 * Returns a new stream with spurious content removed, anything between proper
 * [LSP messages](https://microsoft.github.io/language-server-protocol/specifications/specification-3-14/)
 * is discarded.
 * 
 * This is necessary because the Idris 2 core writes error messages directly to stdout.
 *
 * @param source idris2-lsp stdout
 */
function sanitized(source: Readable): NodeJS.ReadableStream {
  return Readable.from(sanitize(source));
}

async function* sanitize(source: Readable) {

  let waitingFor = 0;
  let chunks = [];

  for await (const chunk of source) {
    if (waitingFor > 0) {
      // We are already reading a message
      const newChunk = chunk.length <= waitingFor
        ? chunk
        : chunk.subarray(0, waitingFor); // ignore anything after the expected content length

      waitingFor -= newChunk.length;

      yield newChunk;
      continue;
    }

    chunks.push(chunk);

    const pending = Buffer.concat(chunks);
    const header = findHeader(pending);
    if (header) {
      const contentLength = header.contentLength;
      const newChunk = pending.subarray(header.begin, header.end + contentLength);
      const headerLength = header.end - header.begin;
      waitingFor = headerLength + contentLength - newChunk.length;
      chunks = [];

      yield newChunk;
      continue;
    }

    // Reuse concat result
    chunks = [pending];
  }
}

interface ContentHeader {
  begin: number,
  end: number,
  contentLength: number
}

function findHeader(buffer: Buffer): undefined | ContentHeader {
  // Search the buffer for the pattern `Content-Length: \d+\r\n\r\n`
  let searchIndex = 0;
  while (searchIndex < buffer.length) {
    const headerPattern = 'Content-Length: ';
    const separatorPattern = '\r\n\r\n';
    const begin = buffer.indexOf(headerPattern, searchIndex);
    if (begin < 0) {
      break;
    }
    const lengthBegin = begin + headerPattern.length;
    const separatorIndex = buffer.indexOf(separatorPattern, lengthBegin);
    if (separatorIndex > lengthBegin) {
      const lengthBuffer = buffer.subarray(lengthBegin, separatorIndex);
      if (lengthBuffer.every((value, _index, _array) => isDigit(value))) {
        const contentLength = Number.parseInt(lengthBuffer.toString('utf-8'));
        const end = separatorIndex + separatorPattern.length;
        return { begin, end, contentLength };
      }
    }
    searchIndex = lengthBegin;
  }
  return undefined;
}

function isDigit(value: number): boolean {
  return value >= zero && value <= nine;
}

const zero = '0'.charCodeAt(0);

const nine = '9'.charCodeAt(0);

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