import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';

/**
 * TODO: use `LighterCallbacks` from `@metamask/transaction-pay-controller`,
 * `LighterTransferParams` / `LighterTransferResult` and the typed
 * `PerpsController.submitLighterTransfer` from `@metamask/perps-controller`
 * once this app depends on releases with MetaMask/core#11730.
 */
interface LighterTransferParams {
  /** Index of the Lighter account the quote debits. */
  accountIndex: number;
  /** Account that owns the Lighter balance being withdrawn. */
  eoa: Hex;
  toAccountIndex: number;
  assetIndex: number;
  fromRouteType: number;
  toRouteType: number;
  amount: number;
  usdcFee: number;
  memo: Hex;
}

export type LighterTransferRequest = LighterTransferParams;

interface LighterTransferSubmitter {
  submitLighterTransfer(
    params: LighterTransferParams,
  ): Promise<{ success: boolean; error?: string }>;
}

export interface LighterCallbacks {
  submitTransfer(
    request: LighterTransferRequest,
  ): Promise<{ success: boolean; error?: string }>;
}

/**
 * Sends the Lighter transfer that Relay returned for a withdrawal. The Lighter
 * provider signs it with the user's Lighter API key and the wallet, and refuses
 * it when `eoa` is not the selected wallet or `accountIndex` is not the Lighter
 * account it would sign for.
 *
 * @returns The Lighter callbacks for the transaction pay controller.
 */
export function createLighterCallbacks(): LighterCallbacks {
  return {
    submitTransfer: async (transfer) => {
      const perpsController = Engine.context
        .PerpsController as unknown as LighterTransferSubmitter;
      const result = await perpsController.submitLighterTransfer(transfer);

      if (!result.success) {
        throw new Error(result.error ?? 'Lighter transfer failed');
      }

      return result;
    },
  };
}
