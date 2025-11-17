import { createAsyncMiddleware } from '@metamask/json-rpc-engine';
import type { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import type { NetworkController } from '@metamask/network-controller';
import type { PreferencesController } from '@metamask/preferences-controller';
import Logger from '../../util/Logger';
import {
  parseTypedDataMessage,
  extractSpenderFromApprovalData,
  extractSpenderFromPermitMessage,
  resemblesAddress,
} from '../../lib/address-scanning/address-scan-util';

/**
 * JSON-RPC request with networkClientId
 */
interface AddressScanRequest extends JsonRpcRequest {
  networkClientId?: string;
  params?: Json[];
}

/**
 * Configuration for the address scan middleware
 */
interface AddressScanMiddlewareConfig {
  phishingController: PhishingController;
  networkController: NetworkController;
  preferencesController: PreferencesController;
}

/**
 * RPC methods that should trigger address scanning
 */
// const SCANNABLE_METHODS = [
//   'eth_sendTransaction',
//   'eth_signTypedData',
//   'eth_signTypedData_v3',
//   'eth_signTypedData_v4',
// ] as const;

/**
 * Normalize chainId to lowercase hex with 0x prefix
 *
 * @param chainId - The chainId to normalize
 * @returns Normalized chainId
 */
function normalizeChainId(chainId: string): string {
  if (!chainId.startsWith('0x')) {
    return `0x${parseInt(chainId, 10).toString(16)}`;
  }
  return chainId.toLowerCase();
}

/**
 * Get chainId for the current request
 *
 * @param req - The JSON-RPC request
 * @param networkController - The network controller
 * @returns The chainId or undefined if not available
 */
function getChainIdForRequest(
  req: AddressScanRequest,
  networkController: NetworkController,
): string | undefined {
  try {
    const networkClientId =
      req.networkClientId || networkController.state.selectedNetworkClientId;

    if (!networkClientId) {
      return undefined;
    }

    const networkConfig =
      networkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );

    if (!networkConfig?.chainId) {
      return undefined;
    }

    return normalizeChainId(networkConfig.chainId);
  } catch (error) {
    Logger.log('[AddressScanMiddleware] Failed to get chainId:', error);
    return undefined;
  }
}

/**
 * Scan an address using the phishing controller
 *
 * @param phishingController - The phishing controller
 * @param chainId - The chainId
 * @param address - The address to scan
 * @param context - Context string for logging
 */
async function scanAddress(
  phishingController: PhishingController,
  chainId: string,
  address: string,
  context: string,
): Promise<void> {
  if (!resemblesAddress(address)) {
    return;
  }

  try {
    await phishingController.scanAddress(chainId, address);
    Logger.log(
      `[AddressScanMiddleware] Scanned address ${address} on chain ${chainId} (${context})`,
    );
  } catch (error) {
    Logger.log(
      `[AddressScanMiddleware] Failed to scan address ${address} (${context}):`,
      error,
    );
  }
}

/**
 * Handle eth_sendTransaction address scanning
 *
 * @param req - The JSON-RPC request
 * @param phishingController - The phishing controller
 * @param chainId - The chainId
 */
async function handleEthSendTransaction(
  req: AddressScanRequest,
  phishingController: PhishingController,
  chainId: string,
): Promise<void> {
  if (!Array.isArray(req.params) || req.params.length === 0) {
    return;
  }

  const txParams = req.params[0];
  if (typeof txParams !== 'object' || txParams === null) {
    return;
  }

  const { to, data } = txParams as { to?: string; data?: string };

  Logger.log('[AddressScanMiddleware] to:', to);

  // Always scan the 'to' address (contract or EOA)
  if (to) {
    await scanAddress(phishingController, chainId, to, 'transaction:to');
  }

  // If this is an approval transaction, also scan the spender
  if (data && typeof data === 'string') {
    const spenderAddress = extractSpenderFromApprovalData(
      data as unknown as Hex,
    );
    Logger.log('[AddressScanMiddleware] spenderAddress:', spenderAddress);
    if (spenderAddress) {
      await scanAddress(
        phishingController,
        chainId,
        spenderAddress,
        'transaction:spender',
      );
    }
  }
}

/**
 * Handle eth_signTypedData address scanning
 *
 * @param req - The JSON-RPC request
 * @param phishingController - The phishing controller
 * @param chainId - The chainId
 */
async function handleEthSignTypedData(
  req: AddressScanRequest,
  phishingController: PhishingController,
  chainId: string,
): Promise<void> {
  if (!Array.isArray(req.params) || req.params.length < 2) {
    return;
  }

  // For eth_signTypedData variants, the typed data is in params[1]
  const typedData = req.params[1];
  const typedDataMessage = parseTypedDataMessage(
    typedData as unknown as string | object,
  );

  if (!typedDataMessage) {
    return;
  }

  // Scan the verifying contract address
  const verifyingContract = typedDataMessage.domain?.verifyingContract;
  Logger.log('[AddressScanMiddleware] verifyingContract:', verifyingContract);
  if (verifyingContract) {
    await scanAddress(
      phishingController,
      chainId,
      verifyingContract,
      'signature:verifyingContract',
    );
  }

  // If this is a permit signature, also scan the spender
  const spenderAddress = extractSpenderFromPermitMessage(typedDataMessage);
  Logger.log('[AddressScanMiddleware] spenderAddress:', spenderAddress);
  if (spenderAddress) {
    await scanAddress(
      phishingController,
      chainId,
      spenderAddress,
      'signature:spender',
    );
  }
}

/**
 * Create the address scan middleware
 *
 * This middleware scans addresses in transactions and signatures for security threats.
 * It is non-blocking and runs in the background.
 *
 * @param config - The middleware configuration
 * @returns The middleware function
 */
export function createAddressScanMiddleware({
  phishingController,
  networkController,
}: AddressScanMiddlewareConfig) {
  return createAsyncMiddleware(async (req: AddressScanRequest, _res, next) => {
    try {
      // // Fast exit if this is not a scannable method
      // if (
      //   !SCANNABLE_METHODS.includes(
      //     req.method as (typeof SCANNABLE_METHODS)[number],
      //   )
      // ) {
      //   return next();
      // }

      // Get chainId for the request
      const chainId = getChainIdForRequest(req, networkController);
      if (!chainId) {
        Logger.log(
          '[AddressScanMiddleware] Could not determine chainId for request',
        );
        return next();
      }

      Logger.log('[AddressScanMiddleware] ChainId:', chainId);
      Logger.log('[AddressScanMiddleware] Method:', req.method);

      // Fire and forget - scan addresses without blocking the request
      if (req.method === 'eth_sendTransaction') {
        Logger.log('[AddressScanMiddleware] Handling eth_sendTransaction');
        handleEthSendTransaction(req, phishingController, chainId).catch(
          (error) => {
            Logger.log(
              '[AddressScanMiddleware] Error in handleEthSendTransaction:',
              error,
            );
          },
        );
      } else if (
        req.method === 'eth_signTypedData' ||
        req.method === 'eth_signTypedData_v3' ||
        req.method === 'eth_signTypedData_v4'
      ) {
        Logger.log('[AddressScanMiddleware] Handling eth_signTypedData');
        handleEthSignTypedData(req, phishingController, chainId).catch(
          (error) => {
            Logger.log(
              '[AddressScanMiddleware] Error in handleEthSignTypedData:',
              error,
            );
          },
        );
      }
    } catch (error) {
      Logger.log('[AddressScanMiddleware] Unexpected error:', error);
    } finally {
      // Always call next to ensure the request continues
      next();
      Logger.log('[AddressScanMiddleware] Request processed');
      Logger.log(
        '[AddressScanMiddleware] addressScanCache:',
        JSON.stringify(phishingController.state.addressScanCache, null, 2),
      );
    }
  });
}
