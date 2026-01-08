import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { TokensControllerState, Token } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from './networkController';
import { PopularList } from '../util/networks/customNetworks';
import { ChainId } from '@metamask/controller-utils';

// TODO Unified Assets Controller State Access (1)
// TokensController: allTokens, allIgnoredTokens, allDetectedTokens
// References
// app/selectors/tokensController.ts (8)
const selectTokensControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.TokensController;

// TODO Unified Assets Controller State Access (1)
// TokensController: allTokens
// References
// app/selectors/tokensController.ts (2)
// app/reducers/swaps/index.js (2)
// app/components/Views/confirmations/legacy/SendFlow/Amount/index.js (1)
// app/components/Views/Asset/index.js (1)
// app/components/Nav/Main/RootRPCMethodsUI.js (1)
// app/components/Views/confirmations/legacy/components/TransactionReview/index.js (1)
// app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx (1)
// app/components/Views/TransactionsView/index.js (1)
// app/components/UI/PaymentRequest/index.js (1)
// app/components/Views/confirmations/legacy/components/ApproveTransactionReview/VerifyContractDetails/VerifyContractDetails.tsx (1)
// app/components/Views/confirmations/legacy/Send/index.js (1)
export const selectTokens = createDeepEqualSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allTokens[chainId]?.[selectedAddress as Hex] || [],
);

// TODO Unified Assets Controller State Access (1)
// TokensController: allTokens
// References
// app/components/UI/SearchTokenAutocomplete/index.tsx (1)
// app/components/UI/TransactionElement/index.js (1)
// app/components/Views/confirmations/hooks/useTokenAmount.ts (1)
// app/components/UI/TransactionElement/TransactionDetails/index.js (1)
// app/components/Views/confirmations/hooks/tokens/useAddToken.ts (1)
export const selectTokensByChainIdAndAddress = createDeepEqualSelector(
  selectTokensControllerState,
  selectSelectedInternalAccountAddress,
  (_state, chainId: Hex) => chainId,
  (
    tokensControllerState: TokensControllerState,
    selectedAddress: string | undefined,
    chainId: Hex,
  ) =>
    tokensControllerState?.allTokens[chainId]?.[selectedAddress as Hex]?.reduce(
      (tokensMap: { [address: string]: Token }, token: Token) => ({
        ...tokensMap,
        [token.address]: token,
      }),
      {},
    ) ?? {},
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokens
// References
// app/components/UI/Notification/TransactionNotification/index.js (1)
export const selectTokensByAddress = createSelector(
  selectTokens,
  (tokens: Token[]) =>
    tokens?.reduce((tokensMap: { [address: string]: Token }, token: Token) => {
      tokensMap[token.address] = token;
      return tokensMap;
    }, {}),
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokens
// References
// app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js (1)
// app/components/Views/confirmations/legacy/ApproveView/Approve/index.js (1)
// app/components/Views/confirmations/legacy/Approve/index.js (1)
// app/components/UI/AccountApproval/index.js (1)
export const selectTokensLength = createSelector(
  selectTokens,
  (tokens: Token[]) => tokens.length,
);

// TODO Unified Assets Controller State Access (1)
// TokensController: allIgnoredTokens
// References
// None found
export const selectIgnoreTokens = createSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allIgnoredTokens?.[chainId]?.[
      selectedAddress as Hex
    ],
);

// TODO Unified Assets Controller State Access (1)
// TokensController: allDetectedTokens
// References
// app/components/Views/Wallet/index.tsx (1)
// app/components/Views/DetectedTokens/index.tsx (1)
export const selectDetectedTokens = createSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allDetectedTokens?.[chainId]?.[
      selectedAddress as Hex
    ],
);

// TODO Unified Assets Controller State Access (1)
// TokensController: allTokens
// References
// app/selectors/tokensController.ts (3)
// app/selectors/multichain/evm.ts (1)
// app/selectors/assets/balances.ts (1)
// app/reducers/swaps/index.js (2)
// app/components/Views/AssetDetails/index.tsx (1)
// app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx (1)
// app/components/hooks/useGetFormattedTokensPerChain.tsx (1)
export const selectAllTokens = createDeepEqualSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.allTokens,
);

export const getChainIdsToPoll = createDeepEqualSelector(
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
  (networkConfigurations, currentChainId) => {
    const popularNetworksChainIds = PopularList.map(
      (popular) => popular.chainId,
    );
    return Object.keys(networkConfigurations).filter(
      (chainId) =>
        chainId === currentChainId ||
        chainId === ChainId.mainnet ||
        chainId === ChainId['linea-mainnet'] ||
        popularNetworksChainIds.includes(chainId as Hex),
    );
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllTokens
// References
// app/util/sentry/tags/index.ts (1)
export const selectAllTokensFlat = createSelector(
  selectAllTokens,
  (tokensByAccountByChain: {
    [account: string]: { [chainId: string]: Token[] };
  }): Token[] => {
    if (Object.values(tokensByAccountByChain).length === 0) {
      return [];
    }
    const tokensByAccountArray = Object.values(tokensByAccountByChain);

    return tokensByAccountArray.reduce<Token[]>((acc, tokensByAccount) => {
      const tokensArray = Object.values(tokensByAccount).flat();
      return acc.concat(...tokensArray);
    }, []);
  },
);

// TODO Unified Assets Controller State Access (1)
// TokensController: allDetectedTokens
// References
// app/selectors/tokensController.ts (1)
export const selectAllDetectedTokensForSelectedAddress = createSelector(
  selectTokensControllerState,
  selectSelectedInternalAccountAddress,
  (tokensControllerState, selectedAddress) => {
    // Updated return type to specify the structure more clearly
    if (!selectedAddress) {
      return {} as { [chainId: Hex]: Token[] }; // Specify return type
    }

    return Object.entries(
      tokensControllerState?.allDetectedTokens || {},
    ).reduce<{
      [chainId: string]: Token[];
    }>((acc, [chainId, chainTokens]) => {
      const tokensForAddress = chainTokens[selectedAddress] || [];
      if (tokensForAddress.length > 0) {
        acc[chainId] = tokensForAddress.map((token: Token) => ({
          ...token,
          chainId,
        }));
      }
      return acc;
    }, {});
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllDetectedTokensForSelectedAddress
// References
// app/components/Views/Wallet/index.tsx (1)
// app/components/Views/DetectedTokens/index.tsx (1)
export const selectAllDetectedTokensFlat = createSelector(
  selectAllDetectedTokensForSelectedAddress,
  (detectedTokensByChain: { [chainId: string]: Token[] }) => {
    if (Object.keys(detectedTokensByChain).length === 0) {
      return [];
    }

    const flattenedTokens: (Token & { chainId: Hex })[] = [];

    for (const [chainId, addressTokens] of Object.entries(
      detectedTokensByChain,
    )) {
      for (const token of addressTokens) {
        flattenedTokens.push({
          ...token,
          chainId: chainId as Hex,
        });
      }
    }

    return flattenedTokens;
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllTokens
// References
// None found
// Full selector implementation with selected address filtering
export const selectTransformedTokens = createSelector(
  selectAllTokens,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  (
    allTokens: TokensControllerState['allTokens'],
    selectedAddress: string | undefined,
    networkId: Hex,
    isAllNetworks: boolean,
    isPopularNetwork: boolean,
  ) => {
    if (!isAllNetworks || !isPopularNetwork) {
      return allTokens[networkId]?.[selectedAddress as Hex];
    }

    // Filter for the selected address and transform
    const flatList = Object.entries(allTokens).flatMap(
      ([chainId, addresses]) => {
        if (selectedAddress && addresses[selectedAddress]) {
          return addresses[selectedAddress].map((token) => ({
            ...token,
            chainId, // Add chainId to the token property
            address: selectedAddress, // Add the selected address as a property
          }));
        }
        return [];
      },
    );

    return flatList;
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllTokens
// References
// app/core/Engine/controllers/transaction-controller/event_properties/metamask-pay.ts (1)
// app/components/Views/confirmations/hooks/transactions/useUpdateTokenAmount.ts (1)
// app/components/Views/confirmations/hooks/tokens/useTokenWithBalance.ts (1)
export const selectSingleTokenByAddressAndChainId = createSelector(
  selectAllTokens,
  (_state: RootState, tokenAddress: Hex) => tokenAddress,
  (_state: RootState, _tokenAddress: Hex, chainId: Hex) => chainId,
  (allTokens, tokenAddress, chainId) => {
    const chainTokens = Object.values(allTokens[chainId] ?? {}).flat();

    return chainTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
  },
);
