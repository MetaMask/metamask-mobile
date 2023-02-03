@androidApp 
@regression

Feature: Exploring wizard

  Scenario: A user should be able to go through the start exploring tutorial
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And the onboarding wizard is visible on wallet view

    When On the onboarding wizard I tap on "Take a Tour" button
    Then the tutorial modal heading should read "Your Accounts"
    And there should be an explanation of the accounts functionality.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Edit Account Name"
    And there should be an explanation about adding a nickname to your account.
    And I should see the "Skip Tutorial" button

    When I tap and hold on the account Name
    Then I should be able to edit the account Name

    When I enter "Big Bank" for account name
    Then the account nickname should read "Big Bank"

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Main Menu"
    And there should be an explanation of the what exists within the burger menu.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Explore the Browser"
    And there should be an explanation of the what the purpose of the browser.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Back" button
    Then the tutorial modal heading should read "Main Menu"
    And there should be an explanation of the what exists within the burger menu.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Explore the Browser"
    And there should be an explanation of the what the purpose of the browser.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Search"
    And there should be an explanation of the what the purpose of the search input box.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the onboarding wizard is no longer visible
    And the "Skip" button is no longer visible

  Scenario: A user should be able to tap the Skip button and the onboarding tutorial modal should disappear
    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And the onboarding wizard is visible on wallet view

    When On the onboarding wizard I tap on "Take a Tour" button
    Then the tutorial modal heading should read "Your Accounts"
    And there should be an explanation of the accounts functionality.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Got it" button
    Then the tutorial modal heading should read "Edit Account Name"
    And there should be an explanation about adding a nickname to your account.
    And I should see the "Skip Tutorial" button

    When On the onboarding wizard I tap on "Skip" button
    Then the onboarding wizard is no longer visible
    And the "Skip" button is no longer visible
