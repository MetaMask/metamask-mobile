@androidApp
Feature: Address
              You can saved an ENS name to your address book
              The contacts you saved on network A does not carry over to network B



        Scenario: A user attempts to send to a contract address in the send flow
            Given I import wallet using seed phrase "fold media south add since false relax immense pause cloth just raven"
              And I tap No thanks on the onboarding welcome tutorial
             When I tap on button with text "Send"
              And I enter a contract address "0xdac17f958d2ee523a2206206994597c13d831ec7" in the sender's input box
        
            #  Then I am taken to the send view
            #   And  there is a QR code button in the sender's input box
            #  When
            #  Then I should see a warning message "this is a token contract address .. etc"
            #   And I see a button with text "I understand the risks, continue"
            #  When I tap on to  "I understand the risks, continue"
            #  Then I proceed to the amount view