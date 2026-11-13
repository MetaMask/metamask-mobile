# Send ETH from Account 1 to Account 2 on the same SRP [scenario shadow]

Tags: @PerformanceShadow
Team: @confirmations-team
Platforms: Android

<!-- The original spec (System tag) has no timers, so this scenario has none. -->
<!-- Like the original, this sends from the account selected after login (Account 1, shown as "Ramon1", 0x19a7…1C94). It needs mainnet ETH for the amount plus the network fee; when that is missing the app's "Insufficient funds" alert stops the run before Confirm. -->

## Steps

1. Secret: Log in to the wallet
2. Tap the Send button on the wallet home
3. Select ETH on Ethereum as the token to send [check: testID=send_amount]
4. Enter 0.00001 as the amount
5. Tap Continue
6. Enter 0xb1D018BE7a9cFD7AC6c5Cce00835a8F2386173d8 as the recipient address
7. Tap Review [check: testID=confirm-button]
8. Tap Confirm [check: gone testID=confirm-button]
9. Open the Activity tab [check: testID=activity-screen-safe-area-view] [check: testID=activity-list]
10. Expect: the sent 0.00001 ETH transaction is listed in Activity [check: testID=transaction-item-0 text=/Confirmed/]
