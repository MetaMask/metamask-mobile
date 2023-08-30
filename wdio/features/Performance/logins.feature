Feature: Blah
    Scenario: Vault recovery with SRP already backed up
        "Protect your wallet" modal should not appear after a vault recovery if the user already backed up the SRP

        Given the user has already backed up the SRP
        When a user goes through the vault recovery flow
        Then the "Protect your wallet" modal should not appear

    Scenario: "Protect your wallet" modal should only prompt the user to back up their SRP without asking to create a new password.

        Given I created a wallet
        And I did not back up my SRP
        When I go through the vault recovery flow
        And I successfully confirmed my password
        And I am on the main wallet view
        When I tap on "protect wallet" in the protect your wallet modal
        And I proceed to back up my SRP
        And I get to the secure wallet page
        Then I should not get prompted to create a new password
        And I should be able to create

    Scenario Outline: The user creates a new wallet but did not back up SRP,  then goes through the backup SRP Flow via protect your wallet modal on the wallet screen

        You should test on a device that has biometrics enabled and another device that does not have any biometrics enabled.

        Given I created a new wallet without backing up my SRP
        And I land on the wallet view
        When I tap on "protect wallet" in the protect your wallet modal
        And I proceed to back up my SRP
        And I get to the secure wallet page
        When I type to confirm my password
        Then the "invalid password" error should not appear.



    Scenario: User goes through "Protect your wallet" modal should not appear after a vault recovery if the user already backed up the SRP

        Given the user has already backed up the SRP
        When a user goes through the vault recovery flow
        Then the "Protect your wallet" modal should not appear


- "Protect your wallet" modal should not appear after a vault recovery if the user already as backed up the SRP
- "Protect your wallet" modal should only prompt the user to back up their SRP without asking to create a new password.
- "Create Password" flow should not indicate "invalid password" when setting up a new password
- New user goes through vault corruption flow, upon entering a new password, the "invalid password" error should not appear.
- User changes password. Then kills the app. Upon relaunching the app, the vault corruption flow is trigger. When user goes through