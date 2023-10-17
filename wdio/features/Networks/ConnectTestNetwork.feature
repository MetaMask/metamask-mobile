@androidApp
@networks
Feature: ConnectTestNetwork

  Scenario: Import wallet
    Given the app displayed the splash animation
    And I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial

  Scenario: Connect to a test network using the Test Network Toggle
    Given I tap on the navbar network title button
    And the Network List Modal is Displayed
    When I tap the Test Network toggle
    Then the Test Network toggle value should be "ON"
    When I tap on the "Goerli Test Network" button
    Then "Goerli Test Network" should be displayed in network educational modal
    And I should see the added network name "Goerli Test Network" in the top navigation bar

  Scenario: Change to the Test Network Toggle to OFF while connected to Test network
    Given I tap on the navbar network title button
    And the Network List Modal is Displayed
    When I tap the Test Network toggle
    Then the Test Network toggle value should be "ON"

  Scenario: Change to the Test Network Toggle to OFF
    Given I tap on the "Ethereum Main Network" button
    And "Ethereum Main Network" should be displayed in network educational modal
    And I should see the added network name "Ethereum Main Network" in the top navigation bar
    And I tap on the navbar network title button
    And the Network List Modal is Displayed
    When I tap the Test Network toggle
    Then the Test Network toggle value should be "OFF"
    And Ethereum Main Network should be the only Network displayed
