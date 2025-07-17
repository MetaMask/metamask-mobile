<!--
Please submit this PR as a draft initially.
Do not mark it as "Ready for review" until the template has been completely filled out, and PR status checks have passed at least once.
-->

## **Description**

This PR implements the USDC deposit flow for Perps (perpetual futures) trading on HyperLiquid. Users can now deposit USDC from their MetaMask wallet to their perps trading account.

**Reason for change:**
- Enable users to fund their perpetual futures trading account
- Part of the Perps trading feature implementation

**Improvement/Solution:**
- Complete deposit flow with amount input, preview, and transaction execution
- Integration with Bridge's token selector for consistent cross-network UX
- Provider-level validation for protocol-specific rules (minimum deposits)
- Real-time gas fee estimates and transaction status tracking

## **Changelog**

CHANGELOG entry: Added USDC deposit flow for perpetual futures trading

## **Related issues**

Fixes: [TAT-1202](https://consensyssoftware.atlassian.net/jira/software/c/projects/TAT/boards/1563?selectedIssue=TAT-1202)

## **Manual testing steps**

1. Navigate to the Perps screen from the main wallet view
2. Tap on "Deposit" button to enter the deposit flow
3. Enter an amount of USDC to deposit (must be at least 5 USDC on mainnet, 10 USDC on testnet)
4. Verify the quote details show:
   - Network fee (real-time gas estimate)
   - MetaMask fee ($0.00 for now)
   - Estimated time (1-2 min)
   - Slippage showing as "Auto"
5. Tap "Get USDC on Hyperliquid" to proceed
6. Confirm the transaction in the transaction modal
7. Verify the processing screen appears with loading animation
8. Verify the success screen appears after transaction completes

**Additional test cases:**
- Try depositing less than minimum (5 USDC) - should show error
- Try depositing more than your balance - should show "Insufficient funds"
- Tap the token selector - should open Bridge's token selector
- Select a different token - currently only USDC is supported
- Test on both mainnet and testnet (minimum is 10 USDC on testnet)

## **Screenshots/Recordings**

### **Before**
No deposit functionality existed for Perps trading.

### **After**

#### Amount Input Screen
- Shows source token (USDC on Arbitrum) 
- Shows destination (USDC on HyperLiquid)
- Keypad with percentage buttons (10%, 25%, Max, Done)
- Quote details card with fees and timing
- Minimum deposit validation

#### Token Selector Integration
- Opens Bridge's source token selector
- Shows tokens from all networks
- Filters by balance

#### Processing Screen
- Loading animation while transaction processes
- Shows transaction status

#### Success Screen
- Confirmation of successful deposit
- Options to continue trading or make another deposit

## **Pre-merge author checklist**

- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [x] I've completed the PR template to the best of my ability
- [ ] I've included tests if applicable *(Unit tests to be added)*
- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.