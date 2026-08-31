import { createAsyncMiddleware } from '@metamask/json-rpc-engine';
import type { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import type { NetworkController } from '@metamask/network-controller';
import Logger from '../../util/Logger';
import {
  parseTypedDataMessage,
  extractSpenderFromApprovalData,
  extractSpenderFromPermitMessage,
  hasValidTransactionParams,
  hasValidTypedDataParams,
  isEthSendTransaction,
  isEthSignTypedData,
  scanAddress,
  scanUrl,
} from '../../lib/address-scanning/address-scan-util';

/**
 * JSON-RPC request with networkClientId and origin
 */
interface TrustSignalsRequest extends JsonRpcRequest {
  networkClientId?: string;
  params?: Json[];
  origin?: string;
}

/**
 * Configuration for the trust signals middleware
 */
interface TrustSignalsMiddlewareConfig {
  phishingController: PhishingController;
  networkController: NetworkController;
}

/**
 * Get chainId for the current request
 *
 * @param req - The JSON-RPC request
 * @param networkController - The network controller
 * @returns The chainId or undefined if not available
 */
function getChainIdForRequest(
  req: TrustSignalsRequest,
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

    return networkConfig.chainId.toLowerCase();
  } catch (error) {
    return undefined;
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
  req: TrustSignalsRequest,
  phishingController: PhishingController,
  chainId: string,
): Promise<void> {
  if (!hasValidTransactionParams(req)) {
    return;
  }

  const txParams = req.params[0] as { to?: string; data?: string };
  const { to, data } = txParams;

  if (to) {
    scanAddress(phishingController, chainId, to);
  }

  if (data && typeof data === 'string') {
    const spenderAddress = extractSpenderFromApprovalData(
      data as unknown as Hex,
    );
    if (spenderAddress) {
      scanAddress(phishingController, chainId, spenderAddress);
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
  req: TrustSignalsRequest,
  phishingController: PhishingController,
  chainId: string,
): Promise<void> {
  if (!hasValidTypedDataParams(req)) {
    return;
  }

  const typedData = req.params[1] as unknown as string | object;
  const typedDataMessage = parseTypedDataMessage(typedData);

  if (!typedDataMessage) {
    return;
  }

  const verifyingContract = typedDataMessage.domain?.verifyingContract;
  if (verifyingContract) {
    scanAddress(phishingController, chainId, verifyingContract);
  }

  const spenderAddress = extractSpenderFromPermitMessage(typedDataMessage);
  if (spenderAddress) {
    scanAddress(phishingController, chainId, spenderAddress);
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
}: TrustSignalsMiddlewareConfig) {
  return createAsyncMiddleware(async (req: TrustSignalsRequest, _res, next) => {
    try {
      if (req.origin) {
        scanUrl(phishingController, req.origin);
      }

      const chainId = getChainIdForRequest(req, networkController);
      if (!chainId) {
        return;
      }

      if (isEthSendTransaction(req)) {
        handleEthSendTransaction(req, phishingController, chainId);
      } else if (isEthSignTypedData(req)) {
        handleEthSignTypedData(req, phishingController, chainId);
      }
    } catch (error) {
      Logger.log('[TrustSignalsMiddleware] Unexpected error:', error);
    } finally {
      next();
    }
  });
}
