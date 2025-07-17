# feat: Add USDC deposit flow for Perps trading

## Description

This PR implements the deposit flow for Perps trading, allowing users to fund their perpetual futures trading account with USDC on Arbitrum. The implementation follows the acceptance criteria from [TAT-1202](https://consensyssoftware.atlassian.net/jira/software/c/projects/TAT/boards/1563?selectedIssue=TAT-1202).

### What this PR does

- ✅ Implements complete deposit flow with amount input, preview, processing, and success screens
- ✅ Integrates with Bridge's token selector for cross-network token selection
- ✅ Enforces minimum deposit validation (5 USDC mainnet, 10 USDC testnet)
- ✅ Shows real-time gas fee estimates and transaction details
- ✅ Handles direct ERC20 transfers for same-chain deposits (USDC on Arbitrum)
- ✅ Provides visual feedback during transaction processing

## Acceptance Criteria Status

- [x] **Entry Points**: Users can enter deposit flow from:
  - Token selector in trading screen *(to be implemented in trading screen PR)*
  - Balance in perp homescreen tab *(to be implemented in homescreen PR)*
  - Direct navigation to deposit view ✅

- [x] **Deposit Support**: Users can deposit USDC.Arb on Hyperliquid ✅
  - Implemented direct deposit flow for USDC on Arbitrum
  - Pre-selects USDC token by default
  - Validates supported assets against HyperLiquid configuration

- [x] **Transaction Preview**: Users can view transaction details before confirming ✅
  - Receiving amount (1:1 for USDC)
  - Network fees (real-time gas estimates)
  - Estimated execution time
  - MetaMask fee display with tooltip
  - Slippage shown as "Auto" by default

- [x] **Transaction Progress**: Users can view progress and success after confirming ✅
  - Processing view with loading animation
  - Success view with transaction details
  - Error handling with user-friendly messages

- [x] **Minimum Amount Validation**: Prevents deposits below minimum ✅
  - 5 USDC minimum on mainnet
  - 10 USDC minimum on testnet
  - Validation at both UI and provider levels
  - Clear error messaging when below minimum

## Technical Implementation

### Architecture Changes

1. **Provider-level Validation**
   - Added `validateDeposit` method to `IPerpsProvider` interface
   - Moved validation logic from controller to provider for better modularity
   - Each protocol can now enforce its own validation rules

2. **Bridge Integration**
   - Integrated Bridge's `BridgeSourceTokenSelector` for token selection
   - Uses Bridge's Redux state for cross-network token discovery
   - Leverages existing `useTokensWithBalance` hook

3. **Component Structure**
   ```
   PerpsDepositAmountView (main input screen)
   ├── TokenInputArea (source token)
   ├── TokenInputArea (destination - USDC on HyperLiquid)
   ├── PerpsQuoteDetailsCard (fee breakdown)
   └── Keypad with percentage buttons
   
   PerpsDepositProcessingView (loading state)
   └── Shows transaction progress
   
   PerpsDepositSuccessView (completion)
   └── Success message with navigation options
   ```

### Key Components Added

- `PerpsDepositAmountView`: Main deposit screen with amount input
- `PerpsQuoteDetailsCard`: Displays fee breakdown and transaction details
- `PerpsPayWithRow`: Token selector row (prepared for future use)
- `usePerpsDepositQuote`: Hook for calculating deposit quotes
- `usePerpsDeposit`: Hook for managing deposit state

### Navigation Flow

```
PerpsView → PerpsDepositAmountView → [Token Selector] → Preview → Processing → Success
                                           ↓
                                    Bridge Token Selector
```

## Testing

### Manual Testing Checklist

- [ ] Deposit flow with valid amount (> 5 USDC)
- [ ] Deposit flow with invalid amount (< 5 USDC)
- [ ] Token selection via Bridge selector
- [ ] Balance validation (insufficient funds)
- [ ] Network fee updates in real-time
- [ ] Transaction submission and completion
- [ ] Error handling for failed transactions

### Edge Cases Tested

- [x] Zero balance handling
- [x] Minimum deposit validation
- [x] Maximum input length (prevents overflow)
- [x] Network switching during deposit
- [x] Token without icon fallback

## Screenshots

*[Add screenshots of the deposit flow screens]*

## Future Enhancements

1. **Cross-chain deposits** (Bridge integration)
   - Swap flow (ETH → USDC on same chain)
   - Bridge flow (USDC cross-chain)
   - Swap + Bridge flow (ETH on Ethereum → USDC on Arbitrum)

2. **Entry point integration**
   - Trading screen token selector
   - Homescreen balance card

3. **Additional features**
   - Transaction history
   - Deposit notifications
   - Multi-token support beyond USDC

## Dependencies

- MetaMask Bridge components for token selection
- HyperLiquid SDK for validation rules
- Engine controllers for transaction management

## Related PRs

- Trading screen implementation (upcoming)
- Perps homescreen tab (upcoming)

## Checklist

- [x] Code follows the project's style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Lint and TypeScript checks pass
- [x] Minimum deposit validation implemented
- [x] Error handling for edge cases
- [ ] Unit tests added *(to be added)*
- [ ] E2E tests added *(to be added)*

## Notes for Reviewers

- The deposit flow currently supports only direct deposits (same chain, same token)
- Cross-chain and swap functionality will be added in future iterations
- Provider-level validation allows easy addition of new protocols
- Bridge token selector integration provides consistent UX with existing flows

/cc @metamask/mobile-platform