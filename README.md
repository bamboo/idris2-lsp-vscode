# Idris 2 Language Server Extension

A Visual Studio Code extension that enables the [Idris 2 language server](https://github.com/idris-community/idris2-lsp) on Idris source files.

In order to simplify testing at this early stage, the extension was made standalone by taking the Idris syntax files from [meraymond2/idris-vscode](https://github.com/meraymond2/idris-vscode).

## Requirements

`idris2-lsp` must be available locally. Refer to the [Idris 2 language server repository](https://github.com/idris-community/idris2-lsp) for instructions.

## Installing the extension

The `idris2-lsp` extension can be installed from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=bamboo.idris2-lsp).

It can also be built and installed locally from the checkout directory with:

```sh
npm install
./sync-engine-version.sh update-in-place
npm install
rm -f *.vsix
version=$(jq -r '.version' package.json)
npm run lint
npm run compile
npm run esbuild
vsce package
code --install-extension "idris2-lsp-${version}.vsix" --force
```

## Configuring the extension

To configure the command used to start the Idris language server, `idris2-lsp` by default, go to `Settings` and search for `idris2`.

## Debugging the extension

- Run `npm install` in this folder
- Open VS Code on this folder
- Press `Ctrl+Shift+D` / `Cmd+Shift+D` to reveal the everything Debug viewlet
- Select `Launch Client` from the drop down
- Run the launch config
