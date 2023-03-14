@iosApp
@androidApp
@ChainScenarios
@regression

Feature: Import Wallet Regression
  Users can use the app to import an existing wallet or create a new one.

  Scenario: Get Started
    Given I just installed MetaMask on my device

    When I launch MetaMask mobile app
    Then "METAMASK" is displayed

    When I tap "Get started"
    Then "Wallet setup" is displayed

    When I tap "Import using Secret Recovery Phrase"
    Then "Help us improve MetaMask" is displayed

    When I tap "I agree"
    Then "Import from seed" is displayed

  Scenario Outline: Password Strength
    When I type <password> in new password field
    Then password strength <strength> is displayed

    Examples:
      | password        | strength                  |
      | metapass1       | Password strength: Weak   |
      | Metapass12345   | Password strength: Good   |
      | Metapass12345!@ | Password strength: Strong |

  Scenario Outline: Password Matching
    When I type <password> in confirm password field
    Then green check mark is displayed

    Examples:
      | password        |
      | Metapass12345!@ |

  Scenario Outline: Invalid SRP
    When I type <invalid_SRP> in SRP field
    And I tap "Import"
    Then device alert <error> is displayed

    When I tap Yes on alert

    Examples:
      | invalid_SRP                                                              | error                                                       |
      | fold media south not valid secret recovery phrase pause cloth just raven | Invalid Secret Recovery Phrase                              |
      | fold media south add since false relax immense pause cloth just          | Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words |

  Scenario: Import Wallet
    When I type <SRP> in SRP field
    And I type <password> in confirm password field
    And I tap "Import"
    And I tap No Thanks on the Enable security check screen
    Then "Welcome to your new wallet!" is displayed

    Examples:
      | SRP                                                                   | password        |
      | fold media south add since false relax immense pause cloth just raven | Metapass12345!@ |
