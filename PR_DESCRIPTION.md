## Description

Predict Next Event Screens now expose authoritative Event and Market rules. A shared rules sheet shows the applicable rules and verified settlement sources. Each source label opens its approved HTTPS URL in the device browser.

## Changelog

Added canonical Event and Market rules with settlement source links to Predict Next.

## Related issues

Refs: [PRED-1235](https://consensyssoftware.atlassian.net/browse/PRED-1235)

## Manual testing steps

```gherkin
Feature: Predict market rules and settlement sources

  Scenario: user views Event and Market rules
    Given a Predict Next Event contains Event rules and Market rules
    When user taps the rules icon for a Market
    Then the shared rules sheet shows the Event rules and selected Market rules once each
    And the sheet shows the approved settlement source labels

  Scenario: user views Event-only rules
    Given a Predict Next Event contains Event rules and no Market rules
    When user taps the Event rules icon
    Then the shared rules sheet shows the Event rules

  Scenario: user opens a settlement source
    Given the shared rules sheet is open
    When user taps a settlement source label
    Then the source URL opens in the device browser
```
