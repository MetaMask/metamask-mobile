import { createAsyncMiddleware } from '@metamask/json-rpc-engine';
import type { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import type { NetworkController } from '@metamask/network-controller';
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
}

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
 */
async function scanAddress(
  phishingController: PhishingController,
  chainId: string,
  address: string,
): Promise<void> {
  if (!resemblesAddress(address)) {
    return;
  }

  try {
    await phishingController.scanAddress(chainId, address);
  } catch (error) {
    Logger.log(
      `[AddressScanMiddleware] Failed to scan address ${address}:`,
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

  if (to) {
    await scanAddress(phishingController, chainId, to);
  }

  if (data && typeof data === 'string') {
    const spenderAddress = extractSpenderFromApprovalData(
      data as unknown as Hex,
    );
    if (spenderAddress) {
      await scanAddress(phishingController, chainId, spenderAddress);
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

  const typedData = req.params[1];
  const typedDataMessage = parseTypedDataMessage(
    typedData as unknown as string | object,
  );

  if (!typedDataMessage) {
    return;
  }

  const verifyingContract = typedDataMessage.domain?.verifyingContract;
  if (verifyingContract) {
    await scanAddress(phishingController, chainId, verifyingContract);
  }

  const spenderAddress = extractSpenderFromPermitMessage(typedDataMessage);
  if (spenderAddress) {
    await scanAddress(phishingController, chainId, spenderAddress);
  }
}

/**
 * Create the Trust Signals middleware
 *
 * This middleware scans addresses in transactions and signatures.
 *
 * @param config - The middleware configuration
 * @returns The middleware function
 */
export function createTrustSignalsMiddleware({
  phishingController,
  networkController,
}: AddressScanMiddlewareConfig) {
  return createAsyncMiddleware(async (req: AddressScanRequest, _res, next) => {
    try {
      const chainId = getChainIdForRequest(req, networkController);
      if (!chainId) {
        Logger.log('[AddressScanMiddleware] Could not get chainId for request');
        return;
      }

      if (req.method === 'eth_sendTransaction') {
        handleEthSendTransaction(req, phishingController, chainId);
      } else if (
        req.method === 'eth_signTypedData' ||
        req.method === 'eth_signTypedData_v1' ||
        req.method === 'eth_signTypedData_v3' ||
        req.method === 'eth_signTypedData_v4'
      ) {
        handleEthSignTypedData(req, phishingController, chainId);
      }
    } catch (error) {
      Logger.log('[AddressScanMiddleware] Unexpected error:', error);
    } finally {
      next();
    }
  });
}
