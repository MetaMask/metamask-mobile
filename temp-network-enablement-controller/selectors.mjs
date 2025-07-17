import { toHex } from "@metamask/controller-utils";
import { toEvmCaipChainId } from "@metamask/multichain-network-controller";
import { isHexString, parseCaipChainId, KnownCaipNamespace } from "@metamask/utils";
import { createSelector } from "reselect";
/**
 * Base selector to get the enabled network map from the controller state.
 *
 * @param state - The NetworkEnablementController state
 * @returns The enabled network map
 */
export const selectEnabledNetworkMap = (state) => state.enabledNetworkMap;
/**
 * Selector to check if a specific network is enabled.
 *
 * This selector accepts either a Hex chain ID (for EVM networks) or a CAIP-2 chain ID
 * (for any blockchain network) and returns whether the network is currently enabled.
 * It returns false for unknown networks or if there's an error parsing the chain ID.
 *
 * @param chainId - The chain ID to check (Hex or CAIP-2 format)
 * @returns A selector function that returns true if the network is enabled, false otherwise
 */
export const selectIsNetworkEnabled = (chainId) => createSelector(selectEnabledNetworkMap, (enabledNetworkMap) => {
    try {
        const caipId = isHexString(chainId)
            ? toEvmCaipChainId(chainId)
            : chainId;
        const { namespace, reference } = parseCaipChainId(caipId);
        let storageKey;
        if (namespace === KnownCaipNamespace.Eip155) {
            storageKey = isHexString(chainId)
                ? chainId
                : toHex(reference);
        }
        else {
            storageKey = caipId;
        }
        return Boolean(enabledNetworkMap[namespace]?.[storageKey]);
    }
    catch {
        return false;
    }
});
/**
 * Selector to get all enabled networks for a specific namespace.
 *
 * This selector returns an array of chain IDs (as strings) for all enabled networks
 * within the specified namespace (e.g., 'eip155' for EVM networks, 'solana' for Solana).
 *
 * @param namespace - The CAIP namespace to get enabled networks for (e.g., 'eip155', 'solana')
 * @returns A selector function that returns an array of chain ID strings for enabled networks in the namespace
 */
export const selectEnabledNetworksForNamespace = (namespace) => createSelector(selectEnabledNetworkMap, (enabledNetworkMap) => {
    return Object.entries(enabledNetworkMap[namespace] ?? {})
        .filter(([, enabled]) => enabled)
        .map(([id]) => id);
});
/**
 * Selector to get all enabled networks across all namespaces.
 *
 * This selector returns a record where keys are CAIP namespaces and values are arrays
 * of enabled chain IDs within each namespace.
 *
 * @returns A selector function that returns a record mapping namespace to array of enabled chain IDs
 */
export const selectAllEnabledNetworks = createSelector(selectEnabledNetworkMap, (enabledNetworkMap) => {
    return Object.keys(enabledNetworkMap).reduce((acc, ns) => {
        acc[ns] = Object.entries(enabledNetworkMap[ns] ?? {})
            .filter(([, enabled]) => enabled)
            .map(([id]) => id);
        return acc;
    }, {});
});
/**
 * Selector to get the total count of enabled networks across all namespaces.
 *
 * @returns A selector function that returns the total number of enabled networks
 */
export const selectEnabledNetworksCount = createSelector(selectAllEnabledNetworks, (allEnabledNetworks) => {
    return Object.values(allEnabledNetworks).reduce((total, networks) => total + networks.length, 0);
});
/**
 * Selector to check if any networks are enabled for a specific namespace.
 *
 * @param namespace - The CAIP namespace to check
 * @returns A selector function that returns true if any networks are enabled in the namespace
 */
export const selectHasEnabledNetworksForNamespace = (namespace) => createSelector(selectEnabledNetworksForNamespace(namespace), (enabledNetworks) => enabledNetworks.length > 0);
/**
 * Selector to get all enabled EVM networks.
 *
 * This is a convenience selector that specifically targets EIP-155 networks.
 *
 * @returns A selector function that returns an array of enabled EVM chain IDs
 */
export const selectEnabledEvmNetworks = createSelector(selectEnabledNetworksForNamespace(KnownCaipNamespace.Eip155), (enabledEvmNetworks) => enabledEvmNetworks);
/**
 * Selector to get all enabled Solana networks.
 *
 * This is a convenience selector that specifically targets Solana networks.
 *
 * @returns A selector function that returns an array of enabled Solana chain IDs
 */
export const selectEnabledSolanaNetworks = createSelector(selectEnabledNetworksForNamespace(KnownCaipNamespace.Solana), (enabledSolanaNetworks) => enabledSolanaNetworks);
//# sourceMappingURL=selectors.mjs.map