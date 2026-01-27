# Components and Hooks Affected by Unified Assets Controller State Access

This document lists all components and hooks that reference selectors marked with `TODO Unified Assets Controller State Access` comments. These files will be affected when the unified assets controller state is implemented.

## Hooks

- [app/components/hooks/useAddressBalance/useAddressBalance.ts](../../components/hooks/useAddressBalance/useAddressBalance.ts)
- [app/components/hooks/useGetFormattedTokensPerChain.tsx](../../components/hooks/useGetFormattedTokensPerChain.tsx)
- [app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx](../../components/hooks/useGetTotalFiatBalanceCrossChains.tsx)
- [app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts](../../components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts)
- [app/components/hooks/useTokenBalancesController/useTokenBalancesController.ts](../../components/hooks/useTokenBalancesController/useTokenBalancesController.ts)
- [app/components/hooks/useTokenHistoricalPrices.ts](../../components/hooks/useTokenHistoricalPrices.ts)
- [app/components/hooks/DisplayName/useERC20Tokens.ts](../../components/hooks/DisplayName/useERC20Tokens.ts)
- [app/components/hooks/DisplayName/useWatchedNFTNames.ts](../../components/hooks/DisplayName/useWatchedNFTNames.ts)
- [app/components/UI/Bridge/hooks/useBridgeExchangeRates/index.ts](../../components/UI/Bridge/hooks/useBridgeExchangeRates/index.ts)
- [app/components/UI/Bridge/hooks/useNonEvmTokensWithBalance/useNonEvmTokensWithBalance.ts](../../components/UI/Bridge/hooks/useNonEvmTokensWithBalance/useNonEvmTokensWithBalance.ts)
- [app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts](../../components/UI/Bridge/hooks/useTokensWithBalance/index.ts)
- [app/components/UI/Bridge/hooks/useTopTokens/index.ts](../../components/UI/Bridge/hooks/useTopTokens/index.ts)
- [app/components/UI/Bridge/hooks/useUnifiedSwapBridgeContext/index.ts](../../components/UI/Bridge/hooks/useUnifiedSwapBridgeContext/index.ts)
- [app/components/UI/Earn/hooks/useEarnLendingPosition.ts](../../components/UI/Earn/hooks/useEarnLendingPosition.ts)
- [app/components/UI/Earn/hooks/useEarnings.ts](../../components/UI/Earn/hooks/useEarnings.ts)
- [app/components/UI/Earn/hooks/useEarnToken.ts](../../components/UI/Earn/hooks/useEarnToken.ts)
- [app/components/UI/Earn/hooks/useEarnTokens.ts](../../components/UI/Earn/hooks/useEarnTokens.ts)
- [app/components/UI/Earn/hooks/useHasMusdBalance.ts](../../components/UI/Earn/hooks/useHasMusdBalance.ts)
- [app/components/UI/Earn/hooks/useInput.ts](../../components/UI/Earn/hooks/useInput.ts)
- [app/components/UI/Earn/hooks/useMultichainInputHandlers.ts](../../components/UI/Earn/hooks/useMultichainInputHandlers.ts)
- [app/components/UI/Earn/hooks/useMusdConversionStatus.ts](../../components/UI/Earn/hooks/useMusdConversionStatus.ts)
- [app/components/UI/Perps/hooks/usePerpsPaymentTokens.ts](../../components/UI/Perps/hooks/usePerpsPaymentTokens.ts)
- [app/components/UI/Perps/hooks/useWithdrawTokens.ts](../../components/UI/Perps/hooks/useWithdrawTokens.ts)
- [app/components/UI/Ramp/Aggregator/hooks/useBalance.ts](../../components/UI/Ramp/Aggregator/hooks/useBalance.ts)
- [app/components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts](../../components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts)
- [app/components/UI/Ramp/Deposit/hooks/useChainIdsWithBalance.ts](../../components/UI/Ramp/Deposit/hooks/useChainIdsWithBalance.ts)
- [app/components/UI/Stake/hooks/useBalance.ts](../../components/UI/Stake/hooks/useBalance.ts)
- [app/components/UI/Tokens/hooks/useTokenPricePercentageChange.ts](../../components/UI/Tokens/hooks/useTokenPricePercentageChange.ts)
- [app/components/Views/confirmations/hooks/nft/useNft.ts](../../components/Views/confirmations/hooks/nft/useNft.ts)
- [app/components/Views/confirmations/hooks/send/useAccountTokens.ts](../../components/Views/confirmations/hooks/send/useAccountTokens.ts)
- [app/components/Views/confirmations/hooks/send/useCurrencyConversions.ts](../../components/Views/confirmations/hooks/send/useCurrencyConversions.ts)
- [app/components/Views/confirmations/hooks/send/useNfts.ts](../../components/Views/confirmations/hooks/send/useNfts.ts)
- [app/components/Views/confirmations/hooks/tokens/useAddToken.ts](../../components/Views/confirmations/hooks/tokens/useAddToken.ts)
- [app/components/Views/confirmations/hooks/tokens/useTokenFiatRates.ts](../../components/Views/confirmations/hooks/tokens/useTokenFiatRates.ts)
- [app/components/Views/confirmations/hooks/tokens/useTokenWithBalance.ts](../../components/Views/confirmations/hooks/tokens/useTokenWithBalance.ts)
- [app/components/Views/confirmations/hooks/transactions/useUpdateTokenAmount.ts](../../components/Views/confirmations/hooks/transactions/useUpdateTokenAmount.ts)
- [app/components/Views/confirmations/hooks/useAccountInfo.ts](../../components/Views/confirmations/hooks/useAccountInfo.ts)
- [app/components/Views/confirmations/hooks/useAccountNativeBalance.ts](../../components/Views/confirmations/hooks/useAccountNativeBalance.ts)
- [app/components/Views/confirmations/hooks/useEthFiatAmount.tsx](../../components/Views/confirmations/hooks/useEthFiatAmount.tsx)
- [app/components/Views/confirmations/hooks/useTokenAmount.ts](../../components/Views/confirmations/hooks/useTokenAmount.ts)
- [app/components/Views/MultichainAccounts/WalletDetails/hooks/useWalletBalances.ts](../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletBalances.ts)

## Components

### Asset Overview & Details

- [app/components/UI/AssetOverview/AssetOverview.tsx](../../components/UI/AssetOverview/AssetOverview.tsx)
- [app/components/UI/AssetOverview/Balance/Balance.tsx](../../components/UI/AssetOverview/Balance/Balance.tsx)
- [app/components/UI/AssetOverview/TokenDetails/TokenDetails.tsx](../../components/UI/AssetOverview/TokenDetails/TokenDetails.tsx)
- [app/components/Views/Asset/index.js](../../components/Views/Asset/index.js)
- [app/components/Views/AssetDetails/index.tsx](../../components/Views/AssetDetails/index.tsx)
- [app/components/Views/AssetLoader/index.tsx](../../components/Views/AssetLoader/index.tsx)
- [app/components/Views/AssetOptions/AssetOptions.tsx](../../components/Views/AssetOptions/AssetOptions.tsx)

### Balance & Aggregated Percentage

- [app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.tsx](../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.tsx)
- [app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx](../../component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx)
- [app/component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx](../../component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx)
- [app/components/UI/Assets/components/Balance/AccountGroupBalance.tsx](../../components/UI/Assets/components/Balance/AccountGroupBalance.tsx)

### Bridge Components

- [app/components/UI/Bridge/components/BridgeSourceNetworkSelector/index.tsx](../../components/UI/Bridge/components/BridgeSourceNetworkSelector/index.tsx)
- [app/components/UI/Bridge/components/TokenInputArea/index.tsx](../../components/UI/Bridge/components/TokenInputArea/index.tsx)
- [app/components/UI/Bridge/components/TokenInsightsSheet/TokenInsightsSheet.tsx](../../components/UI/Bridge/components/TokenInsightsSheet/TokenInsightsSheet.tsx)
- [app/components/UI/Bridge/utils/exchange-rates.ts](../../components/UI/Bridge/utils/exchange-rates.ts)

### Card Components

- [app/components/UI/Card/hooks/useAssetBalances.tsx](../../components/UI/Card/hooks/useAssetBalances.tsx)
- [app/components/UI/Card/hooks/useGetPriorityCardToken.tsx](../../components/UI/Card/hooks/useGetPriorityCardToken.tsx)

### Confirmations (Legacy)

- [app/components/Views/confirmations/legacy/Approval/components/TransactionEditor/index.js](../../components/Views/confirmations/legacy/Approval/components/TransactionEditor/index.js)
- [app/components/Views/confirmations/legacy/Approve/index.js](../../components/Views/confirmations/legacy/Approve/index.js)
- [app/components/Views/confirmations/legacy/ApproveView/Approve/index.js](../../components/Views/confirmations/legacy/ApproveView/Approve/index.js)
- [app/components/Views/confirmations/legacy/components/ApproveTransactionHeader/ApproveTransactionHeader.tsx](../../components/Views/confirmations/legacy/components/ApproveTransactionHeader/ApproveTransactionHeader.tsx)
- [app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js](../../components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js)
- [app/components/Views/confirmations/legacy/components/ApproveTransactionReview/VerifyContractDetails/VerifyContractDetails.tsx](../../components/Views/confirmations/legacy/components/ApproveTransactionReview/VerifyContractDetails/VerifyContractDetails.tsx)
- [app/components/Views/confirmations/legacy/components/TransactionReview/index.js](../../components/Views/confirmations/legacy/components/TransactionReview/index.js)
- [app/components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewData/index.js](../../components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewData/index.js)
- [app/components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewInformation/index.js](../../components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewInformation/index.js)
- [app/components/Views/confirmations/legacy/Send/index.js](../../components/Views/confirmations/legacy/Send/index.js)
- [app/components/Views/confirmations/legacy/SendFlow/AddressFrom/AddressFrom.tsx](../../components/Views/confirmations/legacy/SendFlow/AddressFrom/AddressFrom.tsx)
- [app/components/Views/confirmations/legacy/SendFlow/Amount/index.js](../../components/Views/confirmations/legacy/SendFlow/Amount/index.js)
- [app/components/Views/confirmations/legacy/SendFlow/Confirm/index.js](../../components/Views/confirmations/legacy/SendFlow/Confirm/index.js)

### Confirmations (New)

- [app/components/Views/confirmations/components/gas/gas-fee-token-list-item/gas-fee-token-list-item.tsx](../../components/Views/confirmations/components/gas/gas-fee-token-list-item/gas-fee-token-list-item.tsx)
- [app/components/Views/confirmations/components/transactions/custom-amount/custom-amount.tsx](../../components/Views/confirmations/components/transactions/custom-amount/custom-amount.tsx)

### DeFi Positions

- [app/components/UI/DeFiPositions/DeFiPositionsList.tsx](../../components/UI/DeFiPositions/DeFiPositionsList.tsx)

### Detected Tokens

- [app/components/Views/DetectedTokens/components/Token.tsx](../../components/Views/DetectedTokens/components/Token.tsx)
- [app/components/Views/DetectedTokens/index.tsx](../../components/Views/DetectedTokens/index.tsx)

### Earn Components

- [app/components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.tsx](../../components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.tsx)
- [app/components/UI/Earn/components/Earnings/EarningsHistoryButton/EarningsHistoryButton.tsx](../../components/UI/Earn/components/Earnings/EarningsHistoryButton/EarningsHistoryButton.tsx)
- [app/components/UI/Earn/components/Earnings/index.tsx](../../components/UI/Earn/components/Earnings/index.tsx)
- [app/components/UI/Earn/components/EarnBalance/index.tsx](../../components/UI/Earn/components/EarnBalance/index.tsx)
- [app/components/UI/Earn/components/EarnLendingBalance/index.tsx](../../components/UI/Earn/components/EarnLendingBalance/index.tsx)
- [app/components/UI/Earn/components/EmptyStateCta/index.tsx](../../components/UI/Earn/components/EmptyStateCta/index.tsx)
- [app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx](../../components/UI/Earn/Views/EarnInputView/EarnInputView.tsx)
- [app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/index.tsx](../../components/UI/Earn/Views/EarnLendingDepositConfirmationView/index.tsx)
- [app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx](../../components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx)

### Multichain Accounts

- [app/component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.tsx](../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.tsx)

### Navigation & Main

- [app/components/Nav/Main/RootRPCMethodsUI.js](../../components/Nav/Main/RootRPCMethodsUI.js)

### NFT Details

- [app/components/Views/NftDetails/NftDetails.tsx](../../components/Views/NftDetails/NftDetails.tsx)

### Notifications

- [app/components/UI/Notification/TransactionNotification/index.js](../../components/UI/Notification/TransactionNotification/index.js)

### Payment Request

- [app/components/UI/PaymentRequest/AssetList/index.tsx](../../components/UI/PaymentRequest/AssetList/index.tsx)
- [app/components/UI/PaymentRequest/index.js](../../components/UI/PaymentRequest/index.js)

### Settings

- [app/components/Views/Settings/GeneralSettings/index.js](../../components/Views/Settings/GeneralSettings/index.js)

### Simulation Details

- [app/components/UI/SimulationDetails/FiatDisplay/useFiatFormatter.ts](../../components/UI/SimulationDetails/FiatDisplay/useFiatFormatter.ts)
- [app/components/UI/SimulationDetails/useBalanceChanges.ts](../../components/UI/SimulationDetails/useBalanceChanges.ts)

### Snaps

- [app/components/Snaps/SnapUIAssetSelector/useSnapAssetDisplay.tsx](../../components/Snaps/SnapUIAssetSelector/useSnapAssetDisplay.tsx)

### Staking

- [app/components/UI/Stake/components/StakingBalance/StakingButtons/StakingButtons.tsx](../../components/UI/Stake/components/StakingBalance/StakingButtons/StakingButtons.tsx)

### Swaps

- [app/components/UI/Swaps/components/GasEditModal.js](../../components/UI/Swaps/components/GasEditModal.js)
- [app/components/UI/Swaps/components/QuotesModal.js](../../components/UI/Swaps/components/QuotesModal.js)
- [app/components/UI/Swaps/components/TokenSelectModal.js](../../components/UI/Swaps/components/TokenSelectModal.js)
- [app/components/UI/Swaps/index.js](../../components/UI/Swaps/index.js)
- [app/components/UI/Swaps/QuotesView.js](../../components/UI/Swaps/QuotesView.js)

### Tokens & Token Sort

- [app/components/UI/SearchTokenAutocomplete/index.tsx](../../components/UI/SearchTokenAutocomplete/index.tsx)
- [app/components/UI/TokenImage/index.js](../../components/UI/TokenImage/index.js)
- [app/components/UI/Tokens/TokenSortBottomSheet/TokenSortBottomSheet.tsx](../../components/UI/Tokens/TokenSortBottomSheet/TokenSortBottomSheet.tsx)

### Transactions

- [app/components/UI/Transactions/index.js](../../components/UI/Transactions/index.js)
- [app/components/UI/TransactionElement/index.js](../../components/UI/TransactionElement/index.js)
- [app/components/UI/TransactionElement/TransactionDetails/index.js](../../components/UI/TransactionElement/TransactionDetails/index.js)
- [app/components/Views/TransactionsView/index.js](../../components/Views/TransactionsView/index.js)
- [app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx](../../components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx)

### URL & Account Components

- [app/components/UI/AccountApproval/index.js](../../components/UI/AccountApproval/index.js)
- [app/components/UI/AccountFromToInfoCard/AddressFrom.tsx](../../components/UI/AccountFromToInfoCard/AddressFrom.tsx)
- [app/components/UI/AccountInfoCard/index.js](../../components/UI/AccountInfoCard/index.js)
- [app/components/UI/AccountOverview/index.js](../../components/UI/AccountOverview/index.js)
- [app/components/UI/UrlAutocomplete/index.tsx](../../components/UI/UrlAutocomplete/index.tsx)
- [app/components/UI/UrlAutocomplete/Result.tsx](../../components/UI/UrlAutocomplete/Result.tsx)

### Views

- [app/components/Views/ActivityView/index.js](../../components/Views/ActivityView/index.js)
- [app/components/Views/GasEducationCarousel/index.js](../../components/Views/GasEducationCarousel/index.js)
- [app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx](../../components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx)
- [app/components/Views/TradeWalletActions/TradeWalletActions.tsx](../../components/Views/TradeWalletActions/TradeWalletActions.tsx)
- [app/components/Views/Wallet/index.tsx](../../components/Views/Wallet/index.tsx)
- [app/components/Views/WalletActions/WalletActions.tsx](../../components/Views/WalletActions/WalletActions.tsx)

## Core & Utilities

- [app/core/DeeplinkManager/handlers/legacy/handleCreateAccountUrl.ts](../../core/DeeplinkManager/handlers/legacy/handleCreateAccountUrl.ts)
- [app/core/Engine/controllers/transaction-controller/event_properties/metamask-pay.ts](../../core/Engine/controllers/transaction-controller/event_properties/metamask-pay.ts)
- [app/core/GasPolling/GasPolling.ts](../../core/GasPolling/GasPolling.ts)
- [app/util/sentry/tags/index.ts](../../util/sentry/tags/index.ts)

## Reducers

- [app/reducers/collectibles/collectibles.ts](../../reducers/collectibles/collectibles.ts)
- [app/reducers/collectibles/index.js](../../reducers/collectibles/index.js)
- [app/reducers/swaps/index.js](../../reducers/swaps/index.js)
