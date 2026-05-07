#!/bin/sh
set -e

# Xcode Cloud post-clone hook for Capacitor.
# The repo gitignores ios/App/Pods and ios/App/App/public, so we need to
# install JS deps, build the web bundle, and run pod install before Xcode
# tries to compile.

brew install node@20
brew install cocoapods

cd "$CI_PRIMARY_REPOSITORY_PATH"

npm ci
npm run build
npx cap sync ios
