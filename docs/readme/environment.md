# Environment Setup

## iOS

### Package Manager

Install `brew` package manager.
_NOTE:_ To successfully run the iOS e2e tests, it is essential to install the brew package manager.

[How to install brew](https://brew.sh/#install)

### watchman

Watchman is a tool by Facebook for watching changes in the filesystem. It is highly recommended you install it for better performance.

```bash
brew install watchman
```

### Ruby

MacOS ships with an old ruby version that is incompatible with this project

It is recommended to install a Ruby version manager such as [rbenv](https://github.com/rbenv/rbenv?tab=readme-ov-file#installation)

Install ruby version defined in the file `.ruby-version`

### Gems

Install [`bundler`](https://bundler.io/) gem to manage and install gems such as Cocoapods. The `bundle install` command, which is run during `yarn setup` handles installing gem versions as specified in the project's `GemFile`

```bash
gem install bundler -v 2.5.8 && bundle install
```

### Xcode

The easiest way to install Xcode is via the [Mac App Store](https://itunes.apple.com/us/app/xcode/id497799835?mt=12). Installing Xcode will also install the iOS Simulator and all the necessary tools to build your iOS app.

### Xcode Command Line Tools

You will also need to install the Xcode Command Line Tools. Open Xcode, then choose Settings... (or Preferences...) from the Xcode menu. Go to the Locations panel and install the tools by selecting the most recent version in the Command Line Tools dropdown.

### Installing an iOS Simulator in Xcode

To install a simulator, open Xcode > Settings... (or Preferences...) and select the Platforms (or Components) tab. Select a simulator with the corresponding version of iOS you wish to use.

If you are using Xcode version 14.0 or greater than to install a simulator, open Xcode > Settings > Platforms tab, then click "+" icon and select iOS… option.

### Node

It is recommended to install a Node version manager such as [nodenv](https://github.com/nodenv/nodenv?tab=readme-ov-file#installation), [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating), [asdf](https://asdf-vm.com/guide/getting-started.html#_3-install-asdf)

Install node version defined in the file `.nvmrc`

### Yarn v1

With the correct Node version installed, Yarn v1 can be installed sudo-less in your system using `npm`

```bash
npm install -g yarn
```

## Android

Install [Android Studio](https://developer.android.com/studio)

- Set environment variable `JAVA_HOME=/Applications/Android Studio.app/Contents/jbr/Contents/Home` to use the Java version shipped with Android Studio
- Go to Settings > Languages & Frameworks > Android SDK
- Shortcut: Selecting `More Actions` > `SDK Manager` from the "Welcome to Android Studio" page will also bring you here.
  - Select `SDK Tools` tab
  - Check `Show Package Details` option below the tools list to show available versions
  - Locate `NDK (Side-by-side)` option in the tools list
  - Check NDK version `24.0.8215888`
  - Locate `CMake` option in the tools list
  - Check CMake version `3.22.1`
  - Click "Apply" or "OK" to download
- Finally, start the emulator from Android Studio:
  - Open "Virtual Device Manager"
  - Launch emulator for "Pixel 5 <relevant API version mentioned in [React Native Getting Started](https://reactnative.dev/docs/environment-setup#installing-dependencies)>"

WIP

You are ready to setup metamask-mobile project in your system!
