import { BaseController } from "@metamask/base-controller";
import type { ControllerGetStateAction, ControllerStateChangeEvent, RestrictedMessenger } from "@metamask/base-controller";
import type { MultichainNetworkControllerGetStateAction } from "@metamask/multichain-network-controller";
import type { NetworkControllerGetStateAction, NetworkControllerNetworkAddedEvent, NetworkControllerNetworkRemovedEvent, NetworkControllerStateChangeEvent } from "@metamask/network-controller";
import type { CaipChainId, CaipNamespace, Hex } from "@metamask/utils";
declare const controllerName = "NetworkEnablementController";
/**
 * Information about an ordered network.
 */
export type NetworksInfo = {
    /**
     * The network's chain id
     */
    networkId: CaipChainId;
};
/**
 * A map of enabled networks by namespace and chain id.
 */
type EnabledMap = Record<CaipNamespace, Record<string, boolean>>;
export type NetworkEnablementControllerState = {
    enabledNetworkMap: EnabledMap;
};
export type NetworkEnablementControllerGetStateAction = ControllerGetStateAction<typeof controllerName, NetworkEnablementControllerState>;
export type NetworkEnablementControllerSetEnabledNetworksAction = {
    type: `${typeof controllerName}:setEnabledNetworks`;
    handler: NetworkEnablementController['setEnabledNetwork'];
};
export type NetworkEnablementControllerDisableNetworkAction = {
    type: `${typeof controllerName}:disableNetwork`;
    handler: NetworkEnablementController['setDisabledNetwork'];
};
export type NetworkEnablementControllerIsNetworkEnabledAction = {
    type: `${typeof controllerName}:isNetworkEnabled`;
    handler: NetworkEnablementController['isNetworkEnabled'];
};
/**
 * All actions that {@link NetworkEnablementController} calls internally.
 */
type AllowedActions = NetworkControllerGetStateAction | MultichainNetworkControllerGetStateAction;
export type NetworkEnablementControllerActions = NetworkEnablementControllerGetStateAction | NetworkEnablementControllerSetEnabledNetworksAction | NetworkEnablementControllerDisableNetworkAction | NetworkEnablementControllerIsNetworkEnabledAction;
export type NetworkEnablementControllerStateChangeEvent = ControllerStateChangeEvent<typeof controllerName, NetworkEnablementControllerState>;
export type NetworkEnablementControllerEvents = NetworkEnablementControllerStateChangeEvent;
/**
 * All events that {@link NetworkEnablementController} subscribes to internally.
 */
type AllowedEvents = NetworkControllerNetworkAddedEvent | NetworkControllerNetworkRemovedEvent | NetworkControllerStateChangeEvent;
export type NetworkEnablementControllerMessenger = RestrictedMessenger<typeof controllerName, NetworkEnablementControllerActions | AllowedActions, NetworkEnablementControllerEvents | AllowedEvents, AllowedActions['type'], AllowedEvents['type']>;
/**
 * Controller responsible for managing network enablement state across different blockchain networks.
 *
 * This controller tracks which networks are enabled/disabled for the user and provides methods
 * to toggle network states. It supports both EVM (EIP-155) and non-EVM networks like Solana.
 *
 * The controller maintains a map of enabled networks organized by namespace (e.g., 'eip155', 'solana')
 * and provides methods to query and modify network enablement states.
 */
export declare class NetworkEnablementController extends BaseController<typeof controllerName, NetworkEnablementControllerState, NetworkEnablementControllerMessenger> {
    #private;
    /**
     * Creates a NetworkEnablementController instance.
     *
     * @param args - The arguments to this function.
     * @param args.messenger - Messenger used to communicate with BaseV2 controller.
     * @param args.state - Initial state to set on this controller.
     */
    constructor({ messenger, state, }: {
        messenger: NetworkEnablementControllerMessenger;
        state?: Partial<NetworkEnablementControllerState>;
    });
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
    setEnabledNetwork(chainId: Hex | CaipChainId): void;
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
    setDisabledNetwork(chainId: Hex | CaipChainId): void;
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
    isNetworkEnabled(chainId: Hex | CaipChainId): boolean;
}
export {};
//# sourceMappingURL=NetworkEnablementController.d.mts.map