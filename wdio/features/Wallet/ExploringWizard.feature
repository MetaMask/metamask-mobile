@androidApp
@regression
@wallet
Feature: Exploring wizard

  Scenario: A user should be able to go through the start exploring tutorial
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And the onboarding wizard is visible on wallet view
    When On the onboarding wizard I tap on "Take a Tour" button
    Then the tutorial modal heading should read "Your accounts"
    And there should be an explanation of the accounts functionality.
    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Managing your account"
    And there should be an explanation about adding a nickname to your account.
    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Using your wallet"
    And there should be an explanation of the what exists within the main menu.
    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Exploring web3"
    And there should be an explanation of the what the purpose of the browser.
    When On the onboarding wizard I tap on "Back" button
    Then the tutorial modal heading should read "Using your wallet"
    And there should be an explanation of the what exists within the main menu.
    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Exploring web3"
    And there should be an explanation of the what the purpose of the browser.
    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Using the browser"
    And there should be an explanation of the what the purpose of the search input box.
    When On the onboarding wizard I tap on "Got it" button
    Then the onboarding wizard is no longer visible
    

# Scenario: A user should be able to tap the Skip button
#   Given the app displayed the splash animation
#   And I have imported my wallet
#   And I tap No Thanks on the Enable security check screen
#   And the onboarding wizard is visible on wallet view
# When On the onboarding wizard I tap on "Take a Tour" button
# Then the tutorial modal heading should read "Your Accounts"
# And there should be an explanation of the accounts functionality.
# When On the onboarding wizard I tap on "Got it" button
# Then the tutorial modal heading should read "Edit Account Name"
# And there should be an explanation about adding a nickname to your account.
# When On the onboarding wizard I tap on "Skip" button
# Then the onboarding wizard is no longer visible
# And the "Skip" button is no longer visible
# 
