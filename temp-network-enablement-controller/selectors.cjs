"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectEnabledSolanaNetworks = exports.selectEnabledEvmNetworks = exports.selectHasEnabledNetworksForNamespace = exports.selectEnabledNetworksCount = exports.selectAllEnabledNetworks = exports.selectEnabledNetworksForNamespace = exports.selectIsNetworkEnabled = exports.selectEnabledNetworkMap = void 0;
const controller_utils_1 = require("@metamask/controller-utils");
const multichain_network_controller_1 = require("@metamask/multichain-network-controller");
const utils_1 = require("@metamask/utils");
const reselect_1 = require("reselect");
/**
 * Base selector to get the enabled network map from the controller state.
 *
 * @param state - The NetworkEnablementController state
 * @returns The enabled network map
 */
const selectEnabledNetworkMap = (state) => state.enabledNetworkMap;
exports.selectEnabledNetworkMap = selectEnabledNetworkMap;
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
const selectIsNetworkEnabled = (chainId) => (0, reselect_1.createSelector)(exports.selectEnabledNetworkMap, (enabledNetworkMap) => {
    try {
        const caipId = (0, utils_1.isHexString)(chainId)
            ? (0, multichain_network_controller_1.toEvmCaipChainId)(chainId)
            : chainId;
        const { namespace, reference } = (0, utils_1.parseCaipChainId)(caipId);
        let storageKey;
        if (namespace === utils_1.KnownCaipNamespace.Eip155) {
            storageKey = (0, utils_1.isHexString)(chainId)
                ? chainId
                : (0, controller_utils_1.toHex)(reference);
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
exports.selectIsNetworkEnabled = selectIsNetworkEnabled;
/**
 * Selector to get all enabled networks for a specific namespace.
 *
 * This selector returns an array of chain IDs (as strings) for all enabled networks
 * within the specified namespace (e.g., 'eip155' for EVM networks, 'solana' for Solana).
 *
 * @param namespace - The CAIP namespace to get enabled networks for (e.g., 'eip155', 'solana')
 * @returns A selector function that returns an array of chain ID strings for enabled networks in the namespace
 */
const selectEnabledNetworksForNamespace = (namespace) => (0, reselect_1.createSelector)(exports.selectEnabledNetworkMap, (enabledNetworkMap) => {
    return Object.entries(enabledNetworkMap[namespace] ?? {})
        .filter(([, enabled]) => enabled)
        .map(([id]) => id);
});
exports.selectEnabledNetworksForNamespace = selectEnabledNetworksForNamespace;
/**
 * Selector to get all enabled networks across all namespaces.
 *
 * This selector returns a record where keys are CAIP namespaces and values are arrays
 * of enabled chain IDs within each namespace.
 *
 * @returns A selector function that returns a record mapping namespace to array of enabled chain IDs
 */
exports.selectAllEnabledNetworks = (0, reselect_1.createSelector)(exports.selectEnabledNetworkMap, (enabledNetworkMap) => {
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
exports.selectEnabledNetworksCount = (0, reselect_1.createSelector)(exports.selectAllEnabledNetworks, (allEnabledNetworks) => {
    return Object.values(allEnabledNetworks).reduce((total, networks) => total + networks.length, 0);
});
/**
 * Selector to check if any networks are enabled for a specific namespace.
 *
 * @param namespace - The CAIP namespace to check
 * @returns A selector function that returns true if any networks are enabled in the namespace
 */
const selectHasEnabledNetworksForNamespace = (namespace) => (0, reselect_1.createSelector)((0, exports.selectEnabledNetworksForNamespace)(namespace), (enabledNetworks) => enabledNetworks.length > 0);
exports.selectHasEnabledNetworksForNamespace = selectHasEnabledNetworksForNamespace;
/**
 * Selector to get all enabled EVM networks.
 *
 * This is a convenience selector that specifically targets EIP-155 networks.
 *
 * @returns A selector function that returns an array of enabled EVM chain IDs
 */
exports.selectEnabledEvmNetworks = (0, reselect_1.createSelector)((0, exports.selectEnabledNetworksForNamespace)(utils_1.KnownCaipNamespace.Eip155), (enabledEvmNetworks) => enabledEvmNetworks);
/**
 * Selector to get all enabled Solana networks.
 *
 * This is a convenience selector that specifically targets Solana networks.
 *
 * @returns A selector function that returns an array of enabled Solana chain IDs
 */
exports.selectEnabledSolanaNetworks = (0, reselect_1.createSelector)((0, exports.selectEnabledNetworksForNamespace)(utils_1.KnownCaipNamespace.Solana), (enabledSolanaNetworks) => enabledSolanaNetworks);
//# sourceMappingURL=selectors.cjs.map