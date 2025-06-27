@temp @androidApp @performance @iosApp
# @performance

Feature: Profiling the various Lists
  # This feature measures the cold start of the app when:
  # The time it takes to get from login view to wallet view.

  Background:
    Given I start the fixture server with login state
     When I fill my password in the Login screen
    And The timer starts running after I tap the login button
 
  Scenario: Profile the account list after importing multiple SRPs
    Given I am on the wallet screen
    And I tap on the Identicon
    Then I am on the "Account 1" account
    And I tap on button with text "Add account or hardware wallet"
    And I tap on button with text "Secret Recovery Phrase"
    And I type in my SRP 
    And I tap on button with text "Import Secret Recovery Phrase"
    And I tap on button with text "Continue"
    And I tap on the Identicon
    And I tap on button with text "Account 7"
    And I tap on the Identicon
    And I collect app profiling data at test end
    Then the app profiling data should be saved

   Scenario: Profile network list
    And I am on the wallet view
    And I tap on the Identicon
    Then I am on the "Account 1" account
    And I tap on button with text "Add account or hardware wallet"
    And I tap on button with text "Secret Recovery Phrase"
    And I type in my SRP 
    And I tap on button with text "Import Secret Recovery Phrase"
    And I tap on button with text "Continue"
    And I tap on the Identicon
    And I tap on button with text "Account 8"
    And I tap on the networks filter
    And I filter by popular networks
    And I tap on the Identicon
    And I tap on button with text "Account 9"

    # Scenario: Measure Warm Start after Importing a Wallet
    # Given the app displayed the splash animation
    # And I have imported my wallet
    # And  I dismiss the Solana New Feature Sheet
    # And I am on the wallet view
    # And I tap on the Identicon
    # Then I am on the "Account 1" account
    # And I tap on button with text "Add account or hardware wallet"
    # And I tap on button with text "Secret Recovery Phrase"
    # And I type in my SRP 
    # And I tap on button with text "Import Secret Recovery Phrase"
    # And I wait
    # And I tap on button with text "Continue"
    # And I tap on the Identicon
    # And I tap on button with text "Account 7"
    # And I tap on the Identicon
    # And I collect app profiling data at test end
    # Then the app profiling data should be saved
