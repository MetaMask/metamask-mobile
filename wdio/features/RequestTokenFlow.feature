@androidApp @ChainScenarios
Feature: Request Token
  This feature goes through the request token flow

  Scenario: Create wallet and then add a network

    Given I have imported my wallet
    And I tap No Thanks on the Enable security check screen
    And I tap No thanks on the onboarding welcome tutorial
    When I tap on the navbar network title button
    And I tap on the Add a Network button
    When I tap on network "BNB Smart Chain" to add it
    Then the network approval modal should appear
    When I tap button "Approve" on Approval Modal view
    Then the network approval modal has button "Switch Network" displayed
    When I tap button "Close" on Approval Modal view
    And I close the networks screen view
    Then I am on the main wallet view

  Scenario Outline: Request native token

    When I tap on the navbar network title button
    And I tap on <Network> on Networks list to switch
    And I tap on Got it in the network education modal
    Then I see <Network> visible in the top navigation bar
    When I tap button "Receive" on the main wallet view
    Then Text "Scan address to receive payment" is displayed on Q-R code view
    When I tap button "Request Payment" on Recieve Modal view
    And I tap on button with text "<TokenName>"
    And I type "3" into the Request Amount field
    When I tap button "Reset" on Request Amount view
    Then Text "3" is not displayed on Request Amount view
    When I type "12" into the Request Amount field
    And I tap button "Next" to navigate to Send view
    Then Text "Your request link is ready to send!" is displayed on Send Link view
    And I tap on the close payment request icon
    Examples:
      | Network               | TokenName |
      | BNB Smart Chain       | BNB       |
      | Ethereum Main Network | ETH       |


  Scenario Outline: User requests ERC-20 token
    When I tap on the navbar network title button
    And I tap on <Network> on Networks list to switch
    And I tap button "Receive" on the main wallet view
    Then Text "Scan address to receive payment" is displayed on Q-R code view
    When I tap button "Request Payment" to navigate to Request view
    And I type "<TokenID>" in the Search Assets field
    Then A Button "<FirstTokenName>" is displayed on Request Search view
    When I tap button "<FirstTokenName>" on Search Results view
    Then Text "<TokenID>" is displayed on Request Amount view
    When I tap on the back button on the request view
    Then I am taken back to the Request Search view
    When I type "<SecondTokenID>" in the Search Assets field
    Then Button "<SecondTokenName>" is displayed on Request Search view
    When I tap button "<SecondTokenName>" on Search Results view
    And I type "5" into the Request Amount field
    And I tap button "Next" to navigate to Send view
    Then Text "Your request link is ready to send!" is displayed on Send Link view
    And I tap button "QR Code" on Search Results view
    Then Text "Payment Request QR Code" is displayed on QR Code view
    And I close the request screen
    Examples:
      | Network               | TokenID | FirstTokenName     | SecondTokenID | SecondTokenName |
      | BNB Smart Chain       | BETH    | Binance Beacon ETH | Link          | ChainLink Token |
      | Ethereum Main Network | QNT     | Quant              | CETH          | Compound Ether  |