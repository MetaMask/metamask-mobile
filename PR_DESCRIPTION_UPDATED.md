# feat(infra): add cross-platform build caching with fingerprinting

## **Description**

This PR implements a fingerprinting-based build caching system to optimize CI/CD pipeline performance by detecting when native code has changed. When only JavaScript/TypeScript code changes occur, the system reuses previously built artifacts and updates the JavaScript bundle, significantly reducing build times by avoiding native compilation.

The implementation supports both Android and iOS platforms with cross-platform GitHub Actions and fingerprint-based caching to optimize CI/CD build times.

## **Changelog**

CHANGELOG entry: Added cross-platform build caching system with fingerprinting to optimize CI/CD build times by avoiding unnecessary native compilation when only JavaScript code changes

## **Related issues**

Fixes: #19620

Related to:
- INFRA-2854

## **Manual testing steps**

```gherkin
Feature: Cross-platform build caching with fingerprinting

  Scenario: Android fingerprint-based caching
    Given native Android dependencies have not changed
    When a PR contains only JavaScript/TypeScript changes
    Then the CI pipeline should reuse cached APK artifacts
    And repackage with updated JavaScript bundle
    And skip full native Android compilation

  Scenario: iOS fingerprint-based caching
    Given native iOS dependencies have not changed
    When a PR contains only JavaScript/TypeScript changes
    Then the CI pipeline should reuse cached .app bundle artifacts
    And repackage with updated JavaScript bundle
    And skip full native iOS compilation

  Scenario: Full build when native code changes
    Given native dependencies have changed
    When the fingerprint comparison fails
    Then the CI pipeline performs full native compilation
    And caches the new build artifacts
```

## **Screenshots/Recordings**

<!-- CI pipeline logs showing fingerprint-based build decisions and caching behavior -->

## **Pre-merge author checklist**

- [ ] I’ve followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [ ] I've completed the PR template to the best of my ability
- [ ] I’ve included tests if applicable
- [ ] I’ve documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I’ve applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.

---

## **Technical Details**

### Files Changed:

#### New Files:
- `.fingerprintignore` - Ignore patterns for fingerprint generation
- `.github/actions/fingerprint-build-check/action.yml` - Cross-platform fingerprint checking GitHub Action
- `.github/actions/save-build-fingerprint/action.yml` - Cross-platform fingerprint saving GitHub Action

#### Modified Files:
- `.depcheckrc.yml` - Added @expo/repack-app to dependency check ignores
- `.github/workflows/build-android-e2e.yml` - Added fingerprint-based build caching logic
- `.github/workflows/build-ios-e2e.yml` - Added fingerprint-based build caching logic
- `.github/workflows/needs-e2e-build.yml` - Enabled iOS fingerprinting workflow
