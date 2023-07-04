@androidApp
@regression
@onboarding
Feature: Onboarding Import Wallet
  Users can use the app to import an existing wallet or create a new one.

  Scenario: Get Started
    Given the Welcome Screen is displayed
    When I tap "Get started"
    Then Wallet setup screen is displayed
    When I tap "Import using Secret Recovery Phrase"
    Then "Help us improve MetaMask" is displayed
    And On Wallet Setup Screen I tap "Agree"
    Then Terms of Use is displayed
    When I agree to terms
    Then Terms of Use is not displayed
    And "Import from seed" is displayed

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
    And I tap Yes on alert
    Examples:
      | invalid_SRP                                                              | error                                                       |
      | fold media south not valid secret recovery phrase pause cloth just raven | Invalid Secret Recovery Phrase                              |
      | fold media south add since false relax immense pause cloth just          | Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words |

  Scenario Outline: Import Wallet
    When I type <SRP> in SRP field
    And I type <password> in confirm password field
    And I tap "Import"
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    Then I am on the main wallet view
    Examples:
      | SRP                                                                   | password        |
      | fold media south add since false relax immense pause cloth just raven | Metapass12345!@ |
