@androidApp
@regression
@onboarding
Feature: Onboarding Import Wallet
  Users can use the app to import an existing wallet or create a new one.

  Scenario: Get Started
    Given the Welcome Screen is displayed
    When I tap "Get started"
    Then Terms of Use is displayed
    When I agree to terms
    Then Terms of Use is not displayed
    Then Wallet setup screen is displayed
    When I tap "Have an existing wallet"
    When I tap "Import using Secret Recovery Phrase"
    And "Import from Secret Recovery Phrase" is displayed

#  Scenario Outline: Invalid SRP
#    When I type <invalid_SRP> in SRP field
#    And I tap "Continue"
#    Then device alert <error> is displayed
#    And I tap Yes on alert
#    Examples:
#      | invalid_SRP                                                              | error                                                       |
#      | fold media south not valid secret recovery phrase pause cloth just raven | Invalid Secret Recovery Phrase                              |
#      | fold media south add since false relax immense pause cloth just          | Secret Recovery Phrases contain 12, 15, 18, 21, or 24 words |

  Scenario Outline: Import Wallet
    When I type <SRP> in SRP field
    And I tap "Continue"

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

  Scenario Outline: Create Password
    And I type <password> in confirm password field
    And I tap "Create Password"
    Examples:
      | SRP                                                                   | password        |
      | fold media south add since false relax immense pause cloth just raven | Metapass12345!@ |

   Scenario Outline: Finish flow
    Then "Help us improve MetaMask" is displayed
    And On Wallet Setup Screen I tap "Agree"
    And I tap "Done"
    Then I am on the main wallet view
