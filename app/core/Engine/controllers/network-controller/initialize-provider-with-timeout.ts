import { NetworkController } from '@metamask/network-controller';
import { store } from '../../../../store';
import {
  toggleSlowRpcConnectionModal,
  toggleSlowRpcConnectionBanner,
} from '../../../../actions/modals';
import { selectChainId } from '../../../../selectors/networkController';
import Logger from '../../../../util/Logger';
import { Hex } from '@metamask/utils';

const BANNER_TIMEOUT = 5000; // 5 seconds - shows banner
const MODAL_TIMEOUT = 30000; // 30 seconds - shows modal

/**
 * Initialize network provider with timeout detection for all networks
 * Shows a banner after 5 seconds and modal after 30 seconds
 * All networks are treated equally with the same progressive feedback
 */
export async function initializeProviderWithTimeout(
  networkController: NetworkController,
): Promise<void> {
  const startTime = Date.now();
  let bannerTimeoutId: NodeJS.Timeout | null = null;
  let modalTimeoutId: NodeJS.Timeout | null = null;
  let hasShownBanner = false;
  let hasShownModal = false;

  const state = store.getState();
  const chainId = selectChainId(state);
  const networkConfiguration =
    networkController.getNetworkConfigurationByChainId(chainId as Hex);

  // Only show indicators if we're on the home screen
  // TODO: Add check for current route to ensure we're on home screen

  // Show banner after 5 seconds for ALL networks
  bannerTimeoutId = setTimeout(() => {
    hasShownBanner = true;

    Logger.log(
      `Network initialization slow - showing banner for ${networkConfiguration?.name} (${chainId})`,
    );

    // Show the banner for slow initialization
    store.dispatch(toggleSlowRpcConnectionBanner({ visible: true }));
  }, BANNER_TIMEOUT);

  // Show modal after 30 seconds for ALL networks
  modalTimeoutId = setTimeout(() => {
    hasShownModal = true;

    Logger.log(
      `Network initialization very slow - showing modal for ${networkConfiguration?.name} (${chainId})`,
    );

    // Hide banner if it's showing
    if (hasShownBanner) {
      store.dispatch(toggleSlowRpcConnectionBanner({ visible: false }));
    }

    // Show the modal for very slow initialization
    store.dispatch(
      toggleSlowRpcConnectionModal({
        visible: true,
        connectionState: {
          type: 'degraded',
          chainId,
          rpcUrl:
            networkConfiguration?.rpcEndpoints?.[
              networkConfiguration?.defaultRpcEndpointIndex
            ]?.url,
        },
      }),
    );
  }, MODAL_TIMEOUT);

  try {
    // Initialize the provider
    await networkController.initializeProvider();

    // Clear timeouts if initialization completed successfully
    if (bannerTimeoutId) {
      clearTimeout(bannerTimeoutId);
    }
    if (modalTimeoutId) {
      clearTimeout(modalTimeoutId);
    }

    const elapsedTime = Date.now() - startTime;

    // Hide banner if it was shown
    if (hasShownBanner) {
      store.dispatch(toggleSlowRpcConnectionBanner({ visible: false }));
    }

    // Hide modal if it was shown
    if (hasShownModal) {
      store.dispatch(toggleSlowRpcConnectionModal({ visible: false }));
    }

    if (elapsedTime > MODAL_TIMEOUT) {
      Logger.log(
        `Network initialization completed after modal timeout (${elapsedTime}ms)`,
      );
    } else if (elapsedTime > BANNER_TIMEOUT) {
      Logger.log(
        `Network initialization completed after banner timeout (${elapsedTime}ms)`,
      );
    }
  } catch (error) {
    // Clear timeouts on error
    if (bannerTimeoutId) {
      clearTimeout(bannerTimeoutId);
    }
    if (modalTimeoutId) {
      clearTimeout(modalTimeoutId);
    }

    // Hide banner if it was shown
    if (hasShownBanner) {
      store.dispatch(toggleSlowRpcConnectionBanner({ visible: false }));
    }

    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      `Network initialization failed for ${networkConfiguration?.name}`,
    );

    // Show the modal for failed initialization
    store.dispatch(
      toggleSlowRpcConnectionModal({
        visible: true,
        connectionState: {
          type: 'unavailable',
          chainId,
          rpcUrl:
            networkConfiguration?.rpcEndpoints?.[
              networkConfiguration?.defaultRpcEndpointIndex
            ]?.url,
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    );

    // Re-throw the error so Engine can handle it appropriately
    throw error;
  }
}
