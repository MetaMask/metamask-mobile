Test Automation Strategy
This document defines our test automation strategy and helps you decide which tests to write and when to write them. We follow the testing pyramid: start with a solid foundation of unit tests, add integration tests where systems connect, and use end-to-end tests sparingly for critical paths.
The goal is to give everyone a shared understanding of our testing philosophy, so we make consistent decisions about test placement and coverage. To that end, we cover what each test type is for, when to use it, how to structure tests, and how to maintain them over time.
For detailed implementation examples and framework-specific guidance, see the Testing Documentation section at the bottom.

Quick Summary
Test Type
Purpose
Speed
How Many
Unit
Test individual functions, business logic, and utilities
Fast (milliseconds)
Most (~70%)
Component/View
Test UI components with a realistic app state
Medium (sub-second)
Some (~20%)
E2E
Test complete user flows in the real app
Slow (seconds/minutes)
Fewest (~10%)

Core principles:
Start with unit tests: Cover logic with fast, isolated tests before moving up the pyramid
E2E is a last resort: Only use E2E when lower-level tests can't adequately cover the scenario
Control state programmatically: Use fixtures and test data instead of building everything through the UI
Keep tests maintainable: Write clear, focused tests that are easy to update when code changes

1. Test Types Explained
   1.1 Unit Tests
   What they test: Individual functions, classes, hooks, or utilities in isolation
   How they work:
   Run in Jest with no UI rendering
   Only the unit under test runs; everything else is mocked (services, APIs, hooks, other components, etc.)
   Runs fast enough to get feedback in seconds
   Live right next to the code they're testing
   When to use:
   Pure functions and business logic
   Data transformations and calculations
   Validation logic
   Utility functions and helpers
   State management (reducers, selectors)
   Controller methods
   When NOT to use:
   Testing component rendering
   Testing user interactions
   Testing integration between systems
   Testing anything that requires a full app context
   Example scenarios:
   "Does this function correctly parse a transaction hash?"
   "Does this validation function reject invalid email formats?"
   "Does this selector return the correct filtered list?"
   "Does this utility correctly format currency values?"

1.2 Component/View Tests
What they test: Full screens/pages with realistic app state (Redux, routing/navigation, etc.), without running the full app on a device or in a browser.
How they work:
Render a single screen/page in a test environment
Real Redux store with controlled initial state
Mock only system boundaries: e.g., the “background” layer (extension background script or mobile Engine) and, if needed, the network. Do not mock UI components, hooks, or selectors; behavior is driven by state.
Use testing-library to interact with and assert on the UI
Faster than E2E but slower than unit tests
When to use:
Testing how a screen behaves with different data
User interactions within a single screen (button clicks, form input)
Conditional UI logic (show/hide based on state)
Component-level integration (component + Redux + selectors)
Error states and edge cases in the UI
When NOT to use:
Testing pure business logic. In this case, use unit tests
Testing flows across multiple screens. Opt for E2E tests.
Testing native browser or device functionality. Use E2E tests in this case.
Example scenarios:
"Does the confirm button enable when a quote is available?"
"Does the error message show when the form is invalid?"
"Does the token list display correctly with different balances?"
"Does clicking 'Send' show the correct confirmation details?"

1.3 E2E (End-to-End) Tests
What they test: End-to-end user journeys as a real user would experience them.
How they work:
Run the full app on a device or simulator
Automate real user interactions (click, scroll, tap, type, swipe)
Navigate across multiple screens
May interact with external systems (test servers, mock APIs)
Slowest tests; highest maintenance cost
When to use:
Critical user journeys that generate revenue
Flows that span multiple screens
Integration with external systems (dApps, payment gateways)
Platform-specific behavior validation
When NOT to use:
Testing business logic
Testing UI variations or component states
Testing error messages or validation
Scenarios that can be covered by unit or component tests
Example scenarios:
"User can complete onboarding and see their wallet."
"User can send tokens and see the transaction confirmed."
"User can connect to a dApp and sign a message."
"User can import an existing wallet using a recovery phrase."

2. Decision Framework
   Use this flowchart to decide which test type to write:
   Need to add a test?
   │
   ├─ Does it test a single function, utility, or piece of logic?
   │ └─ YES → Write a unit test
   │
   ├─ Does it test how a screen behaves with different data or user input?
   │ └─ YES → Write a component/view test
   │
   ├─ Does it test a flow across multiple screens?
   │ └─ YES → Write an E2E test
   │
   └─ Is it a critical revenue-generating user journey?
   └─ YES → Write an E2E test (and cover logic with unit tests)
   Quick Reference Table
   Scenario
   Unit
   Component
   E2E
   Testing pure logic or calculations
   ✅
   ❌
   ❌
   Testing a screen with a different state
   ❌
   ✅
   ❌
   Testing button click behavior on one screen
   ❌
   ✅
   ❌
   Testing form validation display
   ❌
   ✅
   ❌
   Testing multi-screen flow
   ❌
   ❌
   ✅
   Testing native features (biometrics, etc.)
   ❌
   ❌
   ✅
   Testing dApp connection
   ❌
   ❌
   ✅
   Fast feedback in CI
   ✅
   ✅
   ❌

3. Component/View vs E2E
   This is the part that’s easy to misunderstand. Here's how to decide:
   Choose Component/View When:
   Testing a single screen with a realistic state
   You need to test UI behavior based on data/state
   You want fast, reliable tests that don't need a real device
   Testing conditional rendering or component interactions
   Testing user interactions that stay on one screen
   Examples:
   "Wallet screen shows correct balance and token list."
   "Bridge view enables confirm button when quote loads."
   "Send screen validates recipient address format."
   "Settings toggle updates local state correctly"
   Choose E2E When:
   Flow spans multiple screens (e.g., onboarding → wallet → send)
   Testing external integrations (dApps, payment providers)
   Validating platform-specific behavior (iOS vs Android)
   Testing critical paths
   Examples:
   "User completes onboarding and sees wallet home screen."
   "User sends tokens and confirms transaction on blockchain."
   "User connects wallet to dApp and signs message."
   "User enables biometric login and unlocks app with fingerprint."

4. E2E-Only Scenarios
   Reserve E2E tests for scenarios that can't be tested any other way:
   Critical User Flows
   Onboarding (create or import wallet)
   Send transactions (native token or ERC-20)
   Receive tokens
   Sign messages or transactions
   Swap tokens
   Trade: (perpetuals or predictions)
   Native Functionality
   Push notifications
   Deep links
   App backgrounding/foregrounding
   External Integrations
   dApp connections and interactions
   Payment gateway flows (onramps/offramps)
   Platform-Specific
   iOS-specific behavior
   Android-specific behavior
   Different screen sizes/orientations
   App upgrades
   Don't duplicate in E2E:
   Business logic (covered with unit tests)
   UI component behavior (cover with component tests)
   Validation logic (cover with unit or component tests)
   Error states (cover with component tests)

5. Writing Tests
   5.1 Unit Tests
   See Guidelines here.
   5.2 Component/View Tests
   See Guidelines here for mobile.
   5.3 E2E Tests
   See Guidelines here.

6. Common Pitfalls
   Over-testing with E2E
   Problem: Writing E2E tests for everything
   Solution: Ask, "Can this be tested at a lower level?" Most things can.
   Under-testing logic
   Problem: Missing unit tests for complex business logic
   Solution: Extract logic to testable functions and cover with unit tests
   Testing implementation details
   Problem: Tests break when refactoring, even though the behavior is unchanged
   Solution: Test user-facing behavior and outcomes, not internal implementation
   Flaky tests
   Problem: Tests pass sometimes and fail other times
   Solution:
   Avoid fixed delays; use explicit waits
   Control time and randomness in tests
   Isolate tests from each other
   Use fixtures for deterministic state
   Unclear test names
   Problem: Can't tell what failed or what the test validates
   Solution: Use descriptive names that explain the scenario and expected outcome
   Slow test suites
   Problem: Tests take too long to run, slowing down development
   Solution: Move tests down the pyramid (E2E → Component → Unit)

7. Test Coverage Goals
   Unit Tests:
   Target: 70%+ code coverage for core logic
   Cover all business logic, utilities, and calculations
   Cover edge cases and error conditions
   Component/View Tests:
   Target: One or more tests per major screen
   Cover critical UI flows and user interactions
   Cover error states and conditional rendering
   E2E Tests:
   Target: All critical user journeys
   Define the top 3-5 critical paths and maintain E2E coverage
   Expand only when necessary (new critical flows)
   Balance:
   Ideal distribution:
   ├─ 70% Unit Tests (fast, isolated)
   ├─ 20% Component Tests (medium speed, realistic context)
   └─ 10% E2E Tests (slow, full integration)

Current state: [measure and document]
Target state: [define your goals]

8. Maintenance
   Updating Tests
   When code changes:
   Update unit tests first (they're fastest to fix)
   Update component tests if screen behavior changed
   Update E2E tests if user flows changed
   Remove tests that no longer apply
   When tests fail:
   Determine if it's a real bug or a test issue
   Fix the bug or update the test
   If a test is consistently flaky, investigate the root cause
   Consider moving the test down the pyramid if possible

9. Getting Started
   Adding Tests to New Features
   Write unit tests first
   Cover business logic and utilities
   Run tests frequently while developing
   Aim for high coverage on logic
   Add component tests for UI
   Test the main screen/component
   Cover happy path and error states
   Test user interactions
   Add E2E only if needed
   Only for critical, multi-screen flows
   Set up the state with fixtures
   Keep tests focused and minimal
   Improving Existing Features
   Audit current tests
   Identify tests at the wrong level
   Find gaps in coverage
   Note flaky or slow tests
   Move tests down the pyramid
   Convert E2E → Component where possible
   Convert Component → Unit where applicable
   Remove duplicate coverage
   Fill coverage gaps
   Add unit tests for untested logic
   Add component tests for critical screens
   Add E2E only for critical flows

10. Quick Reference
    Decision Checklist
    Before writing a test, ask:
    [ ] Can this be tested with a unit test? (fastest, most reliable)
    [ ] Does this need UI rendering? (component test)
    [ ] Does this need real device features? (E2E only)
    [ ] Does this span multiple screens? (E2E only)
    [ ] Is there an existing test covering this scenario?
    [ ] What's the lowest level where I can test this?

11. Additional Resources
    Testing Guidelines
    Unit tests: ​​https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/unit-testing.md
    Integration tests: https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/ui-integration-testing.md
    Mobile Specific test guidelines: https://github.com/MetaMask/metamask-mobile/blob/main/app/util/test/component-view/README.md
    E2E tests: https://github.com/MetaMask/contributor-docs/blob/main/docs/testing/e2e-testing.md
