fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios testflight_main

```sh
[bundle exec] fastlane ios testflight_main
```

Build and upload to TestFlight for MetaMask main app

### ios add_to_testflight_groups

```sh
[bundle exec] fastlane ios add_to_testflight_groups
```

Add an existing build to external TestFlight groups

### ios list_testflight_groups

```sh
[bundle exec] fastlane ios list_testflight_groups
```

List all available external TestFlight groups

### ios upload_to_testflight_only

```sh
[bundle exec] fastlane ios upload_to_testflight_only
```

Upload existing IPA to TestFlight for MetaMask main app

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
