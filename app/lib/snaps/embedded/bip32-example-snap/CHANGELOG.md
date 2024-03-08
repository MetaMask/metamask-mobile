# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.1]
### Changed
- Remove snap icon ([#2189](https://github.com/MetaMask/snaps/pull/2189))

## [2.1.0]
### Changed
- Use `@metamask/snaps-sdk` package ([#1930](https://github.com/MetaMask/snaps/pull/1930),
  [#1946](https://github.com/MetaMask/snaps/pull/1946), [#1950](https://github.com/MetaMask/snaps/pull/1950),
  [#1949](https://github.com/MetaMask/snaps/pull/1949), [#1954](https://github.com/MetaMask/snaps/pull/1954))
  - This package replaces the `@metamask/snaps-types` and
  - `@metamask/snaps-ui` packages, and is much more lightweight.

## [2.0.1]
### Changed
- Update multiple MetaMask dependencies ([#1841](https://github.com/MetaMask/snaps/pull/1841))

## [2.0.0]
### Changed
- **BREAKING:** Bump minimum Node.js version to `^18.16.0` ([#1741](https://github.com/MetaMask/snaps/pull/1741))

## [1.0.0]
### Changed
- Initial stable release from main branch ([#1757](https://github.com/MetaMask/snaps/pull/1757))

## [0.37.3-flask.1]
### Changed
- Use `polyfills` option for specifying Node.js polyfills ([#1650](https://github.com/MetaMask/snaps/pull/1650))

### Fixed
- Remove unused dependencies ([#1680](https://github.com/MetaMask/snaps/pull/1680))

## [0.37.2-flask.1]
### Changed
- Release package independently ([#1600](https://github.com/MetaMask/snaps/pull/1600))
  - The version of the package no longer needs to match the version of all other
    MetaMask Snaps packages.

[Unreleased]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@2.1.1...HEAD
[2.1.1]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@2.1.0...@metamask/bip32-example-snap@2.1.1
[2.1.0]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@2.0.1...@metamask/bip32-example-snap@2.1.0
[2.0.1]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@2.0.0...@metamask/bip32-example-snap@2.0.1
[2.0.0]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@1.0.0...@metamask/bip32-example-snap@2.0.0
[1.0.0]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@0.37.3-flask.1...@metamask/bip32-example-snap@1.0.0
[0.37.3-flask.1]: https://github.com/MetaMask/snaps/compare/@metamask/bip32-example-snap@0.37.2-flask.1...@metamask/bip32-example-snap@0.37.3-flask.1
[0.37.2-flask.1]: https://github.com/MetaMask/snaps/releases/tag/@metamask/bip32-example-snap@0.37.2-flask.1
