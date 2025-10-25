import DevLogger from '../../SDKConnect/utils/DevLogger';
import Logger from '../../../util/Logger';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import { deeplinkService } from '../UnifiedDeeplinkService';
import DeeplinkManager from '../DeeplinkManager';
import SDKConnectV2 from '../../SDKConnectV2';
import extractURLParams from './extractURLParams';
import handleEthereumUrl from '../Handlers/handleEthereumUrl';
import { connectWithWC } from './connectWithWC';

/**
 * Unified deeplink parser that uses the new DeeplinkService
 * This replaces the original parseDeeplink function
 */
async function parseDeeplinkUnified({
  deeplinkManager: instance,
  url,
  origin,
  browserCallBack,
  onHandled,
}: {
  deeplinkManager: DeeplinkManager;
  url: string;
  origin: string;
  browserCallBack?: (url: string) => void;
  onHandled?: () => void;
}) {
  try {
    DevLogger.log('parseDeeplinkUnified: Processing URL', url);

    // Special handling for SDKConnectV2 fast path
    // This needs to happen immediately without waiting for service initialization
    if (SDKConnectV2.isConnectDeeplink(url)) {
      DevLogger.log('parseDeeplinkUnified: SDKConnectV2 fast path');
      await SDKConnectV2.handleConnectDeeplink(url);
      onHandled?.();
      return true;
    }

    // Extract protocol for special cases
    const validatedUrl = new URL(url);
    const protocol = validatedUrl.protocol.replace(':', '');

    // Handle special protocols that aren't action-based
    switch (protocol) {
      case PROTOCOLS.WC:
        // WalletConnect protocol - handled specially
        DevLogger.log('parseDeeplinkUnified: Handling WC protocol');
        {
          onHandled?.();
          const { params } = extractURLParams(url);
          const wcURL = params?.uri || url;
          await connectWithWC({
            handled: () => {
              // Empty handler for WalletConnect
            },
            wcURL,
            origin,
            params,
          });
        }
        return true;

      case PROTOCOLS.ETHEREUM:
        // Ethereum protocol - handled specially
        DevLogger.log('parseDeeplinkUnified: Handling Ethereum protocol');
        onHandled?.();
        await handleEthereumUrl({
          deeplinkManager: instance,
          url,
          origin,
        });
        return true;

      default:
        // All other protocols go through the unified service
        break;
    }

    // Use the unified deeplink service for all other URLs
    const result = await deeplinkService.handleDeeplink(url, {
      navigation: instance.navigation,
      browserCallBack,
      origin,
      onHandled,
    });

    if (!result.success) {
      DevLogger.log(
        'parseDeeplinkUnified: Failed to handle deeplink',
        result.error,
      );

      // Show user-friendly error for certain cases
      if (result.error && !result.shouldProceed) {
        // User declined modal or invalid link
        return false;
      }

      // For other errors, show alert
      if (result.error) {
        Alert.alert(strings('deeplink.invalid'), result.error);
      }

      return false;
    }

    return true;
  } catch (error) {
    DevLogger.log('parseDeeplinkUnified: Error', error);

    const message = error instanceof Error ? error.toString() : 'Unknown error';
    Alert.alert(strings('deeplink.invalid'), message);

    return false;
  }
}

/**
 * Initialize the deeplink service with all default actions
 * This should be called once during app initialization
 */
export async function initializeDeeplinkService() {
  try {
    DevLogger.log('Initializing unified deeplink service');
    await deeplinkService.registerDefaultActions();
  } catch (error) {
    // Log error and potentially show user-facing error
    Logger.error(error as Error, 'Failed to initialize deeplink service');

    // Re-throw to ensure app initialization knows about the failure
    throw error;
  }
}

export default parseDeeplinkUnified;
