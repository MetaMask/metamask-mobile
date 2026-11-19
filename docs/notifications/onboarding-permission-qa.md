# Onboarding notification permission

Enable records an answer before asking the OS. Onboarding uses the OS dialog's actual result; it does not use the legacy helper's undecided/test-build authorization shortcut. Only an allowed result (including previously granted permission) proceeds with MetaMask setup and marketing consent. Denial and Skip preserve existing notification and marketing settings. Already-granted permission still presents the screen: OS permission alone is not new consent to MetaMask marketing.

Enable requires an unlocked wallet. After explicit Enable and OS acceptance, it completes sign-in if needed (automatic sign-in waits for completed onboarding), then the setup hook and shared helper recheck live unlocked/signed-in readiness. The shared enable helper serializes callers and rejects an operation if the controller is already updating outside that queue. Failed setup keeps the screen open, shows a retry message, and does not grant marketing consent. Skip remains available while setup is not ready.

Both answers persist `setPushPrePromptAnswered`; rendering the screen does not. Home pre-prompt eligibility and the fallback respect that answer, and automatic default-enable is suppressed after an answer (including subsequent launches). Explicit Settings actions and refreshing already-enabled notifications remain available. The onboarding screen replaces the first-session home ask for users who answer it.

## Test layer placement

- Component-view: real Redux, setup, storage, and marketing hooks; Engine/native boundaries mocked. iOS and Android cases cover existing OS grant → explicit Enable, Skip, wallet locked, OS denial, and setup failure → retry.
- Unit: shared helper serialization/controller-busy/readiness contracts, setup hook guard, default-enable and fallback suppression, answer timing/double tap, analytics attribution, and existing navigation contracts. Existing narrowly mocked onboarding tests remain for callback timing and OS-result contracts; CV supplies actual setup/consent behavior.
- Appium: explicit Enable during a built-app SRP import journey, as requested in review. CV and integration cannot validate native module linkage and the built app's onboarding transition. The smoke driver grants/accepts permissions by default, so this is not proof of a real denial. Real system-dialog behavior remains in the manual matrix below.

## Manual QA matrix

Run on **non-test iOS and Android builds** (test overrides and automatic alert acceptance can mask OS behavior). For each scenario, exercise SRP create, SRP import, Google login, and Apple login where supported. Start each consent case with marketing and MetaMask notifications off; repeat denial/Skip with existing settings on to verify they are preserved. Reset app/OS permission between undecided cases using a disposable test wallet.

```gherkin
Feature: Notification consent during onboarding
  Background:
    Given I am onboarding a test wallet on iOS or Android
    And notification features and basic functionality are enabled

  Scenario Outline: Accept native permission
    Given I onboard using <method> with undecided OS notification permission
    When I tap "Enable notifications" and allow the native prompt
    Then MetaMask notifications and marketing consent are enabled once
    And I advance to the questionnaire or wallet home
    And home does not present a second notification prompt
    Examples:
      | method       |
      | SRP create   |
      | SRP import   |
      | Google login |
      | Apple login  |

  Scenario: Deny the native prompt
    Given OS notification permission is undecided
    When I tap "Enable notifications" and deny the native prompt
    Then existing notification and marketing settings remain unchanged
    And social-login marketing consent is not sent to the auth server
    And I advance to the questionnaire or wallet home
    And home does not prompt or auto-enable notifications

  Scenario: Skip then visit home
    Given the notification consent screen is visible
    When I tap "Skip for now" and finish any questionnaire
    Then no OS permission prompt appears
    And existing notification and marketing settings remain unchanged
    And home does not show the pre-prompt or fallback or auto-enable notifications
    And relaunching the app does not silently override my answer

  Scenario: Permission already granted
    Given OS notification permission is granted but MetaMask notifications are off
    When I reach the notification consent screen
    Then MetaMask notifications remain off until I choose Enable
    When I tap "Enable notifications"
    Then setup completes without a new OS dialog
    And marketing consent is enabled

  Scenario: Permission previously denied and no longer promptable
    Given the OS cannot display another permission prompt
    When onboarding reaches the notification step
    Then the step is bypassed without enabling notifications or marketing

  Scenario Outline: Ineligible configuration
    Given <configuration>
    When onboarding reaches the notification step
    Then it continues without a notification prompt or new consent
    Examples:
      | configuration                     |
      | notification build flag is off    |
      | assetsNotificationsEnabled is off |
      | basic functionality is disabled   |

  Scenario Outline: Home prompt flag combinations
    Given I answered Enable or Skip during onboarding
    And prePushPromptEnabled is <flag>
    And default notification enable is on
    When I finish onboarding and reach home
    Then neither a second prompt nor default-enable runs
    Examples:
      | flag |
      | on   |
      | off  |

  Scenario: Notification services are not ready
    Given authentication is still completing after vault creation
    When I reach notification consent
    Then an explicit Enable finishes authentication before notification setup
    And a failure shows a retry message without granting marketing consent
    And Skip remains available

  Scenario: Concurrent enable attempts
    Given another entry point is enabling notifications
    When onboarding attempts to enable notifications
    Then controller enable calls never overlap
    And an unsuccessful onboarding attempt can be retried

  Scenario: Setup fails after OS acceptance
    Given notification setup will fail once
    When I tap Enable and allow OS permission
    Then a retry message appears and marketing consent remains unchanged
    When I retry after services recover
    Then setup completes and I advance
```
