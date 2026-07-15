import type { FundingPlan, FundingReceipt } from '../../types';
import type { PredictClient } from '../../adapters/types';
import { PredictError, PredictErrorCode } from '../../types/errors';

/**
 * Lifecycle-aware funding primitive. The POC simplifies the deposit rail:
 * instead of signing a wallet transaction, the user sends USDC out-of-band
 * (Base Sepolia testnet faucet → Kalshi one-time address) and pastes the
 * tx hash. The executor then calls `submitFundingFollowUp` to fire the Kalshi
 * deposit indication, which prefunds the sub-account.
 *
 * Withdraws are venue_api plans: the backend handles register-then-withdraw
 * internally, so the executor just records the resulting transfer_id.
 *
 * Claims are unsupported on Kalshi (settlement is automatic); the adapter
 * surfaces UNSUPPORTED_VENUE_CAPABILITY at plan creation time.
 */

export type WalletTransferPlan = Extract<FundingPlan, { kind: 'wallet_transfer' }>;
export type VenueApiPlan = Extract<FundingPlan, { kind: 'venue_api' }>;

export type ExecutionInput =
  | { kind: 'deposit_manual_tx'; plan: WalletTransferPlan; txHash: string }
  | { kind: 'withdraw_venue_api'; plan: VenueApiPlan };

export class FundingExecutor {
  constructor(private readonly getClient: () => Promise<PredictClient>) {}

  async execute(input: ExecutionInput): Promise<FundingReceipt> {
    if (input.kind === 'deposit_manual_tx') {
      const client = await this.getClient();
      return client.submitFundingFollowUp({
        venueId: input.plan.venueId,
        operation: 'deposit',
        status: 'processing',
        amount: input.plan.amount,
        txHash: input.txHash,
        venueReference: input.plan.venueReference,
      });
    }
    if (input.kind === 'withdraw_venue_api') {
      // Kalshi backend already executed register+withdraw inside
      // `createWithdrawPlan`; the plan's `venueReference` is the transfer_id.
      // Treating that as the receipt is intentional — there's no separate
      // submit step for a venue_api withdrawal on this venue.
      return {
        venueId: input.plan.venueId,
        operation: 'withdraw',
        status: 'submitted',
        amount: input.plan.amount,
        venueReference: input.plan.venueReference,
      };
    }
    throw new PredictError(PredictErrorCode.INVALID_PARAMETERS, 'unknown funding kind');
  }
}
