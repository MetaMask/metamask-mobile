"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NetworkEnablementController_instances, _NetworkEnablementController_deriveKeys, _NetworkEnablementController_ensureNamespaceBucket, _NetworkEnablementController_ensureNetworkEntry, _NetworkEnablementController_removeNetworkEntry, _NetworkEnablementController_hasOneEnabled, _NetworkEnablementController_isKnownNetwork, _NetworkEnablementController_isPopularNetwork, _NetworkEnablementController_toggleNetwork;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkEnablementController = void 0;
const base_controller_1 = require("@metamask/base-controller");
const controller_utils_1 = require("@metamask/controller-utils");
const keyring_api_1 = require("@metamask/keyring-api");
const multichain_network_controller_1 = require("@metamask/multichain-network-controller");
const utils_1 = require("@metamask/utils");
const constants_1 = require("./constants.cjs");
const selectors_1 = require("./selectors.cjs");
// Unique name for the controller
const controllerName = 'NetworkEnablementController';
/**
 * Gets the default state for the NetworkEnablementController.
 *
 * @returns The default state with pre-enabled networks.
 */
const getDefaultNetworkEnablementControllerState = () => ({
    enabledNetworkMap: {
        [utils_1.KnownCaipNamespace.Eip155]: {
            [controller_utils_1.ChainId[controller_utils_1.BuiltInNetworkName.Mainnet]]: true,
            [controller_utils_1.ChainId[controller_utils_1.BuiltInNetworkName.LineaMainnet]]: true,
            [controller_utils_1.ChainId[controller_utils_1.BuiltInNetworkName.BaseMainnet]]: true,
        },
        [utils_1.KnownCaipNamespace.Solana]: {
            [keyring_api_1.SolScope.Mainnet]: true,
        },
    },
});
// Metadata for the controller state
const metadata = {
    enabledNetworkMap: {
        persist: true,
        anonymous: true,
    },
};
/**
 * Controller responsible for managing network enablement state across different blockchain networks.
 *
 * This controller tracks which networks are enabled/disabled for the user and provides methods
 * to toggle network states. It supports both EVM (EIP-155) and non-EVM networks like Solana.
 *
 * The controller maintains a map of enabled networks organized by namespace (e.g., 'eip155', 'solana')
 * and provides methods to query and modify network enablement states.
 */
class NetworkEnablementController extends base_controller_1.BaseController {
    /**
     * Creates a NetworkEnablementController instance.
     *
     * @param args - The arguments to this function.
     * @param args.messenger - Messenger used to communicate with BaseV2 controller.
     * @param args.state - Initial state to set on this controller.
     */
    constructor({ messenger, state, }) {
        super({
            messenger,
            metadata,
            name: controllerName,
            state: {
                ...getDefaultNetworkEnablementControllerState(),
                ...state,
            },
        });
        _NetworkEnablementController_instances.add(this);
        this.messagingSystem = messenger;
        messenger.subscribe('NetworkController:networkAdded', ({ chainId }) => {
            __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_ensureNetworkEntry).call(this, chainId, false);
            __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_toggleNetwork).call(this, chainId, true);
        });
        messenger.subscribe('NetworkController:networkRemoved', ({ chainId }) => {
            __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_removeNetworkEntry).call(this, chainId);
        });
    }
    /**
     * Enables a network for the user.
     *
     * This method accepts either a Hex chain ID (for EVM networks) or a CAIP-2 chain ID
     * (for any blockchain network). The method will automatically convert Hex chain IDs
     * to CAIP-2 format internally. This dual parameter support allows for backward
     * compatibility with existing EVM chain ID formats while supporting newer
     * multi-chain standards.
     *
     * When enabling a non-popular network, this method will disable all other networks
     * to ensure only one network is active at a time (exclusive mode).
     *
     * @param chainId - The chain ID of the network to enable. Can be either:
     * - A Hex string (e.g., '0x1' for Ethereum mainnet) for EVM networks
     * - A CAIP-2 chain ID (e.g., 'eip155:1' for Ethereum mainnet, 'solana:mainnet' for Solana)
     */
    setEnabledNetwork(chainId) {
        __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_toggleNetwork).call(this, chainId, true);
    }
    /**
     * Disables a network for the user.
     *
     * This method accepts either a Hex chain ID (for EVM networks) or a CAIP-2 chain ID
     * (for any blockchain network). The method will automatically convert Hex chain IDs
     * to CAIP-2 format internally.
     *
     * Note: This method will prevent disabling the last remaining enabled network
     * to ensure at least one network is always available.
     *
     * @param chainId - The chain ID of the network to disable. Can be either:
     * - A Hex string (e.g., '0x1' for Ethereum mainnet) for EVM networks
     * - A CAIP-2 chain ID (e.g., 'eip155:1' for Ethereum mainnet, 'solana:mainnet' for Solana)
     */
    setDisabledNetwork(chainId) {
        __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_toggleNetwork).call(this, chainId, false);
    }
    /**
     * Checks if a network is currently enabled for the user.
     *
     * This method accepts either a Hex chain ID (for EVM networks) or a CAIP-2 chain ID
     * (for any blockchain network). It returns false for unknown networks or if there's
     * an error parsing the chain ID.
     *
     * @param chainId - The chain ID of the network to check. Can be either:
     * - A Hex string (e.g., '0x1' for Ethereum mainnet) for EVM networks
     * - A CAIP-2 chain ID (e.g., 'eip155:1' for Ethereum mainnet, 'solana:mainnet' for Solana)
     * @returns True if the network is enabled, false otherwise.
     */
    isNetworkEnabled(chainId) {
        try {
            const { namespace, storageKey } = __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_deriveKeys).call(this, chainId);
            return (namespace in this.state.enabledNetworkMap &&
                Boolean(this.state.enabledNetworkMap[namespace][storageKey]));
        }
        catch {
            return false;
        }
    }
}
exports.NetworkEnablementController = NetworkEnablementController;
_NetworkEnablementController_instances = new WeakSet(), _NetworkEnablementController_deriveKeys = function _NetworkEnablementController_deriveKeys(chainId) {
    const caipId = (0, utils_1.isCaipChainId)(chainId)
        ? chainId
        : (0, multichain_network_controller_1.toEvmCaipChainId)(chainId);
    const { namespace, reference } = (0, utils_1.parseCaipChainId)(caipId);
    let storageKey;
    if (namespace === utils_1.KnownCaipNamespace.Eip155) {
        storageKey = (0, utils_1.isHexString)(chainId) ? chainId : (0, controller_utils_1.toHex)(reference);
    }
    else {
        storageKey = caipId;
    }
    return { namespace, storageKey, caipId };
}, _NetworkEnablementController_ensureNamespaceBucket = function _NetworkEnablementController_ensureNamespaceBucket(state, ns) {
    if (!state.enabledNetworkMap[ns]) {
        state.enabledNetworkMap[ns] = {};
    }
}, _NetworkEnablementController_ensureNetworkEntry = function _NetworkEnablementController_ensureNetworkEntry(chainId, enable = false) {
    const { namespace, storageKey } = __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_deriveKeys).call(this, chainId);
    this.update((s) => {
        __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_ensureNamespaceBucket).call(this, s, namespace);
        if (!(storageKey in s.enabledNetworkMap[namespace])) {
            s.enabledNetworkMap[namespace][storageKey] = enable;
        }
    });
}, _NetworkEnablementController_removeNetworkEntry = function _NetworkEnablementController_removeNetworkEntry(chainId) {
    const { namespace, storageKey } = __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_deriveKeys).call(this, chainId);
    if (__classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_hasOneEnabled).call(this, this.state, namespace, chainId)) {
        return;
    }
    this.update((s) => {
        if (namespace in s.enabledNetworkMap) {
            delete s.enabledNetworkMap[namespace][storageKey];
            if (Object.keys(s.enabledNetworkMap[namespace]).length === 0) {
                delete s.enabledNetworkMap[namespace];
            }
        }
    });
}, _NetworkEnablementController_hasOneEnabled = function _NetworkEnablementController_hasOneEnabled(state, namespace, chainIdToCheck) {
    // Early return if namespace doesn't exist
    if (!state.enabledNetworkMap[namespace]) {
        return false;
    }
    // Parse the chain ID to get the storage key
    const caipId = (0, utils_1.isCaipChainId)(chainIdToCheck)
        ? chainIdToCheck
        : (0, multichain_network_controller_1.toEvmCaipChainId)(chainIdToCheck);
    const { namespace: parsedNamespace, storageKey: targetStorageKey } = __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_deriveKeys).call(this, caipId);
    // Early return if namespaces don't match
    if (parsedNamespace !== namespace) {
        return false;
    }
    const networks = state.enabledNetworkMap[namespace];
    // Get all enabled networks in this namespace
    const enabledNetworks = Object.entries(networks).filter(([_, enabled]) => enabled);
    // Check if there's exactly one enabled network and it matches our target
    if (enabledNetworks.length === 1) {
        const [onlyEnabledKey] = enabledNetworks[0];
        return onlyEnabledKey === targetStorageKey;
    }
    // Return false if there are zero or multiple enabled networks
    return false;
}, _NetworkEnablementController_isKnownNetwork = function _NetworkEnablementController_isKnownNetwork(caipId) {
    const { namespace, reference } = (0, utils_1.parseCaipChainId)(caipId);
    if (namespace === utils_1.KnownCaipNamespace.Eip155) {
        const { networkConfigurationsByChainId } = this.messagingSystem.call('NetworkController:getState');
        return (0, controller_utils_1.toHex)(reference) in networkConfigurationsByChainId;
    }
    if (namespace === utils_1.KnownCaipNamespace.Solana) {
        const { multichainNetworkConfigurationsByChainId } = this.messagingSystem.call('MultichainNetworkController:getState');
        return caipId in multichainNetworkConfigurationsByChainId;
    }
    return false;
}, _NetworkEnablementController_isPopularNetwork = function _NetworkEnablementController_isPopularNetwork(caipId) {
    if ((0, utils_1.isHexString)(caipId)) {
        return constants_1.POPULAR_NETWORKS.includes(caipId);
    }
    const { namespace, reference } = (0, utils_1.parseCaipChainId)(caipId);
    if (namespace === utils_1.KnownCaipNamespace.Eip155) {
        return constants_1.POPULAR_NETWORKS.includes((0, controller_utils_1.toHex)(reference));
    }
    return false;
}, _NetworkEnablementController_toggleNetwork = function _NetworkEnablementController_toggleNetwork(chainId, enable) {
    const { namespace, storageKey, caipId } = __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_deriveKeys).call(this, chainId);
    // Ignore unknown networks
    if (!__classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_isKnownNetwork).call(this, caipId)) {
        return;
    }
    // Don't disable the last remaining enabled network
    if (!enable &&
        Object.values((0, selectors_1.selectAllEnabledNetworks)(this.state)).flat().length <= 1) {
        return;
    }
    this.update((s) => {
        // Ensure entry exists first
        __classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_ensureNetworkEntry).call(this, chainId);
        if (__classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_hasOneEnabled).call(this, s, namespace, chainId)) {
            return;
        }
        // If enabling a non-popular network, disable all networks in the same namespace
        if (enable && !__classPrivateFieldGet(this, _NetworkEnablementController_instances, "m", _NetworkEnablementController_isPopularNetwork).call(this, caipId)) {
            Object.keys(s.enabledNetworkMap[namespace]).forEach((key) => {
                s.enabledNetworkMap[namespace][key] = false;
            });
        }
        s.enabledNetworkMap[namespace][storageKey] = enable;
    });
};
//# sourceMappingURL=NetworkEnablementController.cjs.map