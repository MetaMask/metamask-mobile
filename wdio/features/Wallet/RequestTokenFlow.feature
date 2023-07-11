@androidApp
@regression
@wallet
Feature: Request Token
This feature goes through the request token flow

  Scenario: Create wallet and then add a network
    Given I create a new wallet
    And I select remind me later on secure wallet screen
    And Select "Skip" on remind secure modal
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    And I tap the remind me later button on the Protect Your Wallet Modal
    Then I am on the main wallet view
    When I tap on the navbar network title button
    And I tap on the Add a Network button
    When I tap on network "BNB Smart Chain" to add it
    Then the network approval modal should appear
    When I tap on button with text "Approve"
    Then the network approval modal has button "Switch Network" displayed
    When I tap on button with text "Close"
    And I close the networks screen view
    And I navigate to the wallet
    Then I am on the main wallet view

  Scenario Outline: Request native token
    When I tap on the navbar network title button
    And I select "<Network>" network option
    Then "<Network>" should be displayed in network educational modal
    Then I see "<Network>" visible in the top navigation bar
    When On the Main Wallet view I tap on the Receive Action
    Then "Scan address to receive payment" is visible
    When I tap on button with text "Request Payment"
    And I tap on button with text "<TokenName>"
    And I type "3" into the Request Amount field
    And I tap on button with text "Reset"
    Then "3" is not displayed
    When I type "12" into the Request Amount field
    And I tap on button with text "Next"
    Then "Your request link is ready to send!" is visible
    And I tap on the close payment request icon
    And I tap on button with text "Remind me later"
    Examples:
      | Network               | TokenName |
      | BNB Smart Chain       | BNB       |
      | Ethereum Main Network | ETH       |

  Scenario Outline: User requests ERC-20 token
    When I tap on the navbar network title button
    And I select "<Network>" network option
    And the toast is displayed
    And On the Main Wallet view I tap on the Receive Action
    Then "Scan address to receive payment" is visible
    When I tap on button with text "Request Payment"
    And I type "<TokenID>" in the Search Assets field
    Then "<FirstTokenName>" is visible
    When I tap on button with text "<FirstTokenName>"
    Then "<TokenID>" is visible
    When I tap to navigate back from request view
    And I am taken back to the Request Search view
    And I type "<SecondTokenID>" in the Search Assets field
    Then "<SecondTokenName>" is visible
    When I tap on button with text "<SecondTokenName>"
    And I type "5" into the Request Amount field
    And I tap on button with text "Next"
    Then "Your request link is ready to send!" is visible
    And I tap on button with text "QR Code"
    Then "Payment Request QR Code" is visible
    And I close the request screen
    And I tap on button with text "Remind me later"
    Examples:
      | Network               | TokenID | FirstTokenName     | SecondTokenID | SecondTokenName |
      | BNB Smart Chain       | BETH    | Binance Beacon ETH | Link          | ChainLink Token |
      | Ethereum Main Network | QNT     | Quant Network      | CETH          | Compound Ether  |
