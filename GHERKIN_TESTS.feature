Feature: Perps Tab View - User State Based Display
  As a MetaMask Mobile user
  I want to see appropriate UI elements based on my trading state
  So that I have a clear and relevant interface for my current holdings

  Background:
    Given I am a logged in user with Perps access
    And I have navigated to the Perps tab

  @critical
  @ui
  Scenario: User with no positions and no orders sees minimal interface
    Given I have no active positions
    And I have no active orders

    When I view the Perps tab
    Then I should NOT see any empty state text
    And I should NOT see "Start a new trade" CTA
    And I should see the "Manage Balance" button
    And I should NOT see the "Unrealized P&L" pill

  @critical
  @ui
  Scenario: User with orders but no positions sees CTA in orders section
    Given I have no active positions
    And I have 2 active orders

    When I view the Perps tab
    Then I should see the "Orders" section header
    And I should see my 2 active orders listed
    And I should see "Start a new trade" CTA within the orders section
    And I should NOT see the "Positions" section
    And I should see the "Available Balance" pill
    And I should NOT see the "Unrealized P&L" pill

  @critical
  @ui
  Scenario: User with positions but no orders sees CTA in positions section
    Given I have 1 active position
    And I have no active orders

    When I view the Perps tab
    Then I should see the "Positions" section header
    And I should see my active position displayed
    And I should see "Start a new trade" CTA below my positions
    And I should NOT see the "Orders" section
    And I should see both "Available Balance" and "Unrealized P&L" pills

  @critical
  @ui
  Scenario: User with both positions and orders sees single CTA
    Given I have 2 active positions
    And I have 3 active orders

    When I view the Perps tab
    Then I should see both "Positions" and "Orders" sections
    And I should see "Start a new trade" CTA only in the positions section
    And I should NOT see a duplicate CTA in the orders section
    And I should see both "Available Balance" and "Unrealized P&L" pills

  @interaction
  Scenario: First-time user clicks Start Trading CTA
    Given I am a first-time Perps user
    And I have 1 active order

    When I click the "Start a new trade" button
    Then I should be navigated to the Perps tutorial screen

  @interaction
  Scenario: Returning user clicks Start Trading CTA
    Given I am a returning Perps user
    And I have completed the tutorial
    And I have 1 active position

    When I click the "Start a new trade" button
    Then I should be navigated to the Markets screen

  @edge-case
  Scenario: User with zero balance and no holdings
    Given I have zero available balance
    And I have no positions or orders

    When I view the Perps tab
    Then I should NOT see the "Available Balance" pill
    And I should NOT see the "Unrealized P&L" pill
    And I should NOT see any CTA buttons

  @responsive
  Scenario Outline: CTA button displays correctly on different devices
    Given I am using a <device_type> device
    And I have <positions_count> positions
    And I have <orders_count> orders

    When I view the Perps tab
    Then the "Start a new trade" CTA should be <visibility>
    And the CTA should be properly styled for <device_type>

    Examples:
      | device_type | positions_count | orders_count | visibility                   |
      | phone       | 0               | 1            | visible in orders section    |
      | phone       | 1               | 0            | visible in positions section |
      | tablet      | 0               | 1            | visible in orders section    |
      | tablet      | 1               | 1            | visible in positions section |

  @accessibility
  Scenario: Screen reader interaction with dynamic content
    Given I am using a screen reader
    And I have 1 active order and no positions

    When I navigate through the Perps tab
    Then the screen reader should announce "Orders section with 1 active order"
    And the "Start a new trade" button should be accessible
    And the button should have proper ARIA labels

  @performance
  Scenario: Quick state transitions
    Given I have an active position

    When my position is closed
    And I still have an active order
    Then the UI should update within 500ms
    And the "Start a new trade" CTA should move to the orders section
    And there should be no visual glitches during the transition
