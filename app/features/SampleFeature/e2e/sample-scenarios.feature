Feature: Sample Feature Manual Test Scenarios
  As a MetaMask Mobile user
  I want to access and use the Sample Feature
  So that I can test counter functionality and manage pet names for addresses

  Background:
    Given I am logged into MetaMask Mobile
    And I have at least one network configured

  @sample-feature
  @navigation
  @e2e-automated
  Scenario: Access the Sample Feature screen
    Given I am on the Wallet home screen

    When I tap on the Settings tab
    And I scroll down to "Developer Options"
    And I tap on "Developer Options"
    And I tap on "Navigate to Sample Feature" button
    Then I should see the "Sample Feature" screen
    And I should see the "Sample Feature Description" text
    And I should see the current network display
    And I should see the Counter section
    And I should see the Pet Names section

  @sample-feature
  @counter
  @e2e-automated
  Scenario: Test the counter increment functionality
    Given I am on the Sample Feature screen
    And I can see the Counter section with title "Counter"
    And the counter value shows "Value: 0"

    When I tap on the "Increment" button
    Then the counter value should update to "Value: 1"

    When I tap on the "Increment" button again
    Then the counter value should update to "Value: 2"
    And the counter value should persist over sessions and app restart

  @sample-feature
  @petnames
  @create
  @e2e-automated
  Scenario: Create a new pet name
    Given I am on the Sample Feature screen
    And I am connected to "Ethereum Mainnet" network
    And I can see the Pet Names section

    When I enter "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05" in the Address field
    And I enter "Alice" in the Name field
    And I tap on the "Add Pet Name" button
    Then I should see "Alice" in the pet names list
    And the list should show "Alice" with truncated address "0x08647...c6E05"
    And the pet name should be associated with the current network

  @sample-feature
  @petnames
  @validation
  Scenario: Validate pet name form fields
    Given I am on the Sample Feature screen

    When I leave the Address field empty
    And I enter "Test Name" in the Name field
    Then the "Add Pet Name" button should be disabled

    When I enter "invalid-address" in the Address field
    Then the "Add Pet Name" button should be disabled

    When I enter a valid Ethereum address "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05"
    And I clear the Name field
    Then the "Add Pet Name" button should be disabled

    When I enter "Valid Name" in the Name field
    Then the "Add Pet Name" button should be enabled

  @sample-feature
  @petnames
  @update
  Scenario: Update an existing pet name
    Given I am on the Sample Feature screen
    And I have an existing pet name "Alice" for address "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05"

    When I tap on the pet name entry in the list
    Then the Address field should be populated with "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05"
    And the Name field should be populated with "Alice"

    When I change the Name field to "Alice my BFF"
    And I tap on the "Add Pet Name" button
    Then I should see "Alice my BFF" in the pet names list
    And I should not see "Alice" in the pet names list

  @sample-feature
  @petnames
  @duplicate
  Scenario: Handle duplicate address entry
    Given I am on the Sample Feature screen
    And I have an existing pet name "Alice" for address "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05"

    When I manually enter the same address "0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05"
    And I enter "Arthur" in the Name field
    And I tap on the "Add Pet Name" button
    Then I should see an alert with title "Duplicate Address"
    And the alert should have message about updating the existing entry
    And I should see "Cancel" and "Update" buttons

    When I tap "Update"
    Then the pet name should be updated to "Arthur"

  @sample-feature
  @petnames
  @network-specific
  Scenario: Test pet names are network-specific
    Given I am on the Sample Feature screen
    And I am connected to "Ethereum Mainnet" network

    When I create a pet name "Mainnet Wallet" for address "0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44"
    Then I should see "Mainnet Wallet" in the pet names list

    When I switch to "Linea" network
    And I navigate back to the Sample Feature screen
    Then I should not see "Mainnet Wallet" in the pet names list

    When I create a pet name "Linea Wallet" for the same address "0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44"
    Then I should see "Linea Wallet" in the pet names list

    When I switch back to "Ethereum Mainnet" network
    And I navigate back to the Sample Feature screen
    Then I should see "Mainnet Wallet" in the pet names list
    And I should not see "Linea Wallet" in the pet names list

  @sample-feature
  @petnames
  @multiple-entries
  @e2e-automated
  Scenario: Manage multiple pet names
    Given I am on the Sample Feature screen

    When I create the following pet names:
      | Address                                    | Name    |
      | 0x086473d15475Cf20722F5cA7D8d4adfa39Dc6E05 | Alice   |
      | 0x4AE1Ed9eaf935B0043536e83cB833e90e98A0E44 | Bob     |
      | 0xA8c23800fe9942e9aBd6F3669018934598777eC1 | Charlie |
    Then I should see all 3 pet names in the list
    And the list should display the following:
      | Truncated Address | Name    |
      | 0x08647...c6E05   | Alice   |
      | 0x4AE1E...A0E44   | Bob     |
      | 0xA8c23...77eC1   | Charlie |

  @sample-feature
  @ui-elements
  Scenario: Verify UI elements and styling
    Given I am on the Sample Feature screen
    Then I should see the following UI elements:
      | Element         | Description                         |
      | Title           | "Sample Feature" in large heading   |
      | Description     | Feature description in smaller text |
      | Network Display | Current network name with icon      |
      | Counter Card    | White card with counter controls    |
      | Pet Names Card  | White card with list and form       |
    And all interactive elements should have proper touch feedback
    And the screen should be scrollable

  @sample-feature
  @error-handling
  Scenario: Test error handling for invalid addresses
    Given I am on the Sample Feature screen

    When I enter the following invalid addresses:
      | Invalid Address Type | Example                                      |
      | Too short            | 0x123                                        |
      | Too long             | 0x123456789012345678901234567890123456789012 |
      | Invalid characters   | 0xGHIJKL...                                  |
      | Missing 0x prefix    | 086473d15475Cf20722F5cA7D8d4adfa39Dc6E05     |
    Then the "Add Pet Name" button should remain disabled for each invalid input
    And no error messages should crash the application
