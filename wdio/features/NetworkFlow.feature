@androidApp
Feature: Networks
              A user should be able to add a custom network via the popular network flow
              A user should also have the ability to a add custom network via the custom network flow.
              A user should be able to add a custom network via a Dapp.
        Background:
            Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
              And I tap No thanks on the onboarding welcome tutorial
  
        Scenario: Adding a network via the new popular network flow
             When I tap on the navbar network title button
              And I tap on the Add a Network button
             Then "POPULAR" tab is displayed on networks screen
              And "CUSTOM NETWORKS" tab is displayed on networks screen
              And I am on the Popular network view
             When I tap on network "<Network>" to add it
             Then the network approval modal should appear
             When I select approve
             Then the network approval modal has button "Switch Network" displayed
              And the network approval modal has button "Close" displayed
             When I tap on Switch network
             Then I should see the added network name "<Network>" in the top navigation bar
        #       And my token balance shows up correctly with token "ll"
              And I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             Then "<Network>" should be visible below the Custom Networks section
             When I tap on the Add Network button the networks page opens
             Then "<Network>" is not visible in the Popular Networks section
        Examples:
                  | Network |
                  | Palm    |

        Scenario: Adding a network via the custom network flow
            Given I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
              And I tap on the Add Network button the networks page opens
             Then "POPULAR" tab is displayed on networks screen
              And "CUSTOM NETWORKS" tab is displayed on networks screen
             When I tap on the "CUSTOM NETWORKS" tab
             Then Add button is disabled
              And the Network name input box is visible
              And the RPC URL input box is visible
              And the Chain ID input box is visible
              And the Network Symbol input box is visible
             When I type "<Network>" into Network name field
              And I type "<rpcUrl>" into the RPC url field
              And I type "100" into the Chain ID field
              And I type "<Network>" into the Network symbol field
             When I tap on the Add button
             Then I should see the added network name "<Network>" in the top navigation bar
        Examples:
                  | Network | rpcUrl                      |
                  | xDai    | https://rpc.gnosischain.com |


        Scenario: I can remove a custom network that was added via the popular network flow
            Given I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
              And I tap on the Add Network button the networks page opens
             Then "POPULAR" tab is displayed on networks screen
              And "CUSTOM NETWORKS" tab is displayed on networks screen
             When I tap on the "POPULAR" tab
              And I tap on network "<Network>" to add it
              And I select approve
             Then the network approval modal has button "Switch Network" displayed
              And the network approval modal has button "Close" displayed
             When I tap on Switch network
             Then I should see the added network name "Palm" in the top navigation bar
             When I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
              And I tap and hold network "<Network>"
             Then I should see an alert window with the text "Do you want to remove this network"
              And I click "Remove" on remove network modal
             Then "<Network>" should be removed from the list of RPC networks
        Examples:
                  | Network |
                  | Palm    |

        Scenario: I can remove a custom network that was added via the custom network flow
            Given I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
              And I tap on the Add Network button the networks page opens
             Then "POPULAR" tab is displayed on networks screen
              And "CUSTOM NETWORKS" tab is displayed on networks screen
             When I tap on the "CUSTOM NETWORKS" tab
             Then Add button is disabled
              And the Network name input box is visible
              And the RPC URL input box is visible
              And the Chain ID input box is visible
              And the Network Symbol input box is visible
             When I type "<Network>" into Network name field
              And I type "<rpcUrl>" into the RPC url field
              And I type "100" into the Chain ID field
              And I type "<Network>" into the Network symbol field
             When I tap on the Add button
             Then I should see the added network name "<Network>" in the top navigation bar
             When I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             When I tap on network "<Network>" on networks screen
              And a "Delete" button should be visible
              And a "Save" button should be visible
             When I tap the "Delete" button
             Then "<Network>" should be removed from the list of RPC networks
        Examples:
                  | Network | rpcUrl                      |
                  | xDai    | https://rpc.gnosischain.com |