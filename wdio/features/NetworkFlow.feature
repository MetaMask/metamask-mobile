@androidApp
Feature: Networks
              A user should be able to add a custom network via the popular network flow
              A user should also have the ability to a add custom network via the custom network flow.
              A user should be able to add a custom network via a Dapp.
        Background:
            Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
              And I tap No thanks on the onboarding welcome tutorial
  
        Scenario: Adding a network via the new popular network flow
              And I tap on the navbar network title button
             When I tap on the Add a Network button
             Then the networks page opens with two tab views: Popular networks and Custom network
              And I am on the Popular network view
             When I tap on network "Palm" to add it
             Then the network approval modal should appear
              And I select approve
              And the network approval modal has two options Switch network and close
             When I tap on Switch network
              And I should see the added network name "Palm" in the top navigation bar
        #       And my token balance shows up correctly with token "ll"
             When I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             Then "Palm" should be visible below the Custom Networks section
             When I tap on the Add Network button the networks page opens
              And "Palm" is not visible in the Popular Networks section


        Scenario: Adding a network via the custom network flow
            Given I tap on the burger menu
             When I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             When I tap on the Add Network button the networks page opens
             Then the networks page opens with two tab views: Popular networks and Custom network
             When I tap on the "CUSTOM NETWORKS" tab
              And Add button is disabled
              And the Network name input box is visible and I type "xDai "
              And the RPC URL input box is visible and I type "https://rpc.gnosischain.com"
              And the Chain ID input box is visible and I type "100"
              And the Network Symbol input box is visible and I type "xDai"
             When I tap on the Add button
              And I should see the added network name "xDai" in the top navigation bar

        Scenario: I can remove a custom network that was added via the popular network flow
            Given I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
              And I tap on the Add Network button the networks page opens
             Then the networks page opens with two tab views: Popular networks and Custom network
              And I am on the Popular network view
             When I tap on network "Palm" to add it
              And I select approve
             When the network approval modal has two options Switch network and close
             When I tap on Switch network
              And I should see the added network name "Palm" in the top navigation bar
             When I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             When I tap and hold network "Palm"
             Then I should see an alert window with the text "Do you want to remove this network"
            #   And The alert window has two options: "Cancel" and "Remove"
             When I click "Remove" on remove network modal
             Then "Palm" should be removed from the list of RPC networks
            #  When I return to the wallet view
            #   And I tap on the network dropdown in the top navigation bar
            #  Then <NETWORK> should not be visible

        Scenario: I can remove a custom network that was added via the custom network flow
            Given I tap on the burger menu
             When I tap on "Settings" in the menu
              And In settings I tap on "Networks"
             When I tap on the Add Network button the networks page opens
             Then the networks page opens with two tab views: Popular networks and Custom network
             When I tap on the "CUSTOM NETWORKS" tab
              And Add button is disabled
              And the Network name input box is visible and I type "xDai "
              And the RPC URL input box is visible and I type "https://rpc.gnosischain.com"
              And the Chain ID input box is visible and I type "100"
              And the Network Symbol input box is visible and I type "xDai"
             When I tap on the Add button
              And I should see the added network name "xDai" in the top navigation bar

             When I tap on the burger menu
              And I tap on "Settings" in the menu
              And In settings I tap on "Networks"

             When I tap on network "xDai" on networks screen
              And a "Delete" button should be visible
              And a "Cancel" button should be visible
             When I tap the "Delete" button
            #  Then I should see an alert window with the text "Do you want to remove this network"
            #   And The alert message has two options: "Cancel" and "Remove"
            #  When I tap "Remove"
             Then "xDai" should be removed from the list of RPC networks
            #  When I return to the wallet view
            #   And I tap on the network dropdown in the top navigation bar
            #  Then "xDai" should not be visible