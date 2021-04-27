# Idris 2 Language Server Extension

A Visual Studio Code extension that enables the [Idris 2 language server](https://github.com/idris-community/idris2-lsp) on Idris source files.

In order to simplify testing at this early stage, the extension was made standalone by taking the Idris syntax files from [meraymond2/idris-vscode](https://github.com/meraymond2/idris-vscode).

## Running the extension locally

- Run `npm install` in this folder
- Open VS Code on this folder
- Press `Ctrl+Shift+B` / `Cmd+Shift+B` to compile everything
- Open the file `client/src/extension.ts`
- Switch to the Debug viewlet (it's in the leftmost column)
- Click `Run and Debug`
- Select `VSCode Extension development`
- A new window will open
- Open your idris files/repos in this window

## Configuring the extension

To configure the command used to start the Idris language server, `idris2-lsp` by default, go to `Settings` and search for `idris` or `lsp`.
