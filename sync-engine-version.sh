#!/bin/sh

# How it works?
# 1. reads `engines.version` from ./node_modules/vscode-languageclient/package.json
# 2. puts THAT version to `engines.version` and `devDependencies.@types/vscode` in ./package.json
#
# If wont do that - there will be error in logs

# Path to the package.json files
PACKAGE_JSON="./package.json"
LANGUAGE_CLIENT_JSON="./node_modules/vscode-languageclient/package.json"

# Check if the vscode-languageclient package.json exists
if [ ! -f "$LANGUAGE_CLIENT_JSON" ]; then
    echo "File $LANGUAGE_CLIENT_JSON does not exist. Ensure vscode-languageclient is installed."
    exit 1
fi

# Get the engines.vscode version from the vscode-languageclient package.json
vscode_engine_version=$(jq -r '.engines.vscode' "$LANGUAGE_CLIENT_JSON")

# Check if the version was found
if [ "$vscode_engine_version" = "null" ]; then
    echo "engines.vscode version not found in $LANGUAGE_CLIENT_JSON."
    exit 1
fi

# Get the current engines.vscode and @types/vscode version in package.json
current_engine_version=$(jq -r '.engines.vscode' "$PACKAGE_JSON")
current_types_version=$(jq -r '.devDependencies["@types/vscode"]' "$PACKAGE_JSON")

# Function to update package.json
update_package_json() {
    jq --arg version "$vscode_engine_version" \
       '.engines.vscode = $version | .devDependencies["@types/vscode"] = $version' \
       "$PACKAGE_JSON" > temp.json && mv temp.json "$PACKAGE_JSON"
    echo "Updated engines.vscode and devDependencies.@types/vscode to $vscode_engine_version in $PACKAGE_JSON."
}

# Check for command-line argument
case "$1" in
    update-in-place)
        if [ "$current_engine_version" = "$vscode_engine_version" ] && [ "$current_types_version" = "$vscode_engine_version" ]; then
            echo "No updates needed; versions are already up to date."
        else
            update_package_json
        fi
        ;;
    check)
        if [ "$current_engine_version" = "$vscode_engine_version" ] && [ "$current_types_version" = "$vscode_engine_version" ]; then
            echo "Versions are up to date."
        else
            echo "Version mismatch detected:"
            if [ "$current_engine_version" != "$vscode_engine_version" ]; then
                echo "  engines.vscode in $PACKAGE_JSON: $current_engine_version"
            fi
            if [ "$current_types_version" != "$vscode_engine_version" ]; then
                echo "  devDependencies.@types/vscode in $PACKAGE_JSON: $current_types_version"
            fi
            echo "  Expected version from vscode-languageclient: $vscode_engine_version"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {update-in-place|check}"
        exit 1
        ;;
esac
