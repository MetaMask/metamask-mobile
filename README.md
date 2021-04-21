# MetaMask Module Template

This TypeScript module is maintained in the style of the MetaMask team.

## Installation

`yarn add @metamask/this-module`

or

`npm install @metamask/this-module`

## Usage

_Add examples here_

## API

_Add examples here_

## Testing

Run `yarn test` to run the tests once.

To run tests on file changes, run `yarn test:watch`.

## Release & Publishing

The project follows the same release process as the other libraries in the MetaMask organization:

1. Create a release branch
   - For a typical release, this would be based on `main`
   - To update an older maintained major version, base the release branch on the major version branch (e.g. `1.x`)
2. Update the changelog
3. Update version in package.json file (e.g. `yarn version --minor --no-git-tag-version`)
4. Create a pull request targeting the base branch (e.g. master or 1.x)
5. Code review and QA
6. Once approved, the PR is squashed & merged
7. The commit on the base branch is tagged
8. The tag can be published as needed
