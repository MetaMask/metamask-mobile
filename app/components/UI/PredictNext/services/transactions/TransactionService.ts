import { Observable } from '../../session/Observable';
import type { FundingPlan, FundingReceipt } from '../../types';
import { PredictError, PredictErrorCode } from '../../types/errors';
import type { PredictSessionService } from '../../session/PredictSessionService';
import type { PortfolioService } from '../portfolio/PortfolioService';
import type { FundingExecutor } from './FundingExecutor';
import type { PredictAnalytics } from '../analytics/predictAnalytics';

/**
 * POC deposit/withdraw workflow.
 *
 * Deposit: ask the adapter for a wallet_transfer plan (carries the Kalshi
 *   one-time address). The UI shows the address; the user funds it out-of-band
 *   and pastes the tx_hash; this service calls FundingExecutor which fires the
 *   `/deposit/indication` follow-up.
 *
 * Withdraw: the adapter's createWithdrawPlan already triggers the venue
 *   register-then-withdraw; we just surface the resulting transfer_id.
 */

export type TransactionStatus =
  | 'idle'
  | 'preparing'
  | 'awaiting_tx_hash'
  | 'submitting'
  | 'submitted'
  | 'success'
  | 'error';

export interface TransactionState {
  status: TransactionStatus;
  plan?: FundingPlan;
  receipt?: FundingReceipt;
  error?: { code: PredictErrorCode; message: string };
}

const INITIAL: TransactionState = { status: 'idle' };

export class TransactionService extends Observable<TransactionState> {
  constructor(
    private readonly sessionService: PredictSessionService,
    private readonly portfolio: PortfolioService,
    private readonly executor: FundingExecutor,
    private readonly analytics: PredictAnalytics,
  ) {
    super(INITIAL);
  }

  reset(): void {
    this.setState(INITIAL);
  }

  async prepareDeposit(args: { ownerAddress: string; amount: string }): Promise<FundingPlan | undefined> {
    this.setState({ status: 'preparing' });
    try {
      const client = await this.sessionService.getClient(args.ownerAddress);
      const plan = await client.createDepositPlan({ mode: 'fixed-amount', amount: args.amount });
      this.setState({ status: 'awaiting_tx_hash', plan });
      this.analytics.track({ name: 'predict_deposit_prepared', props: { amount: args.amount } });
      return plan;
    } catch (err) {
      this.setError(err);
      return undefined;
    }
  }

  async submitDepositTxHash(txHash: string): Promise<FundingReceipt | undefined> {
    const { plan } = this.getState();
    if (!plan || plan.kind !== 'wallet_transfer' || plan.operation !== 'deposit') {
      this.setError(new PredictError(PredictErrorCode.INVALID_PARAMETERS, 'no deposit plan'));
      return undefined;
    }
    this.setState((prev) => ({ ...prev, status: 'submitting' }));
    const depositPlan = plan;
    try {
      const receipt = await this.executor.execute({
        kind: 'deposit_manual_tx',
        plan: depositPlan,
        txHash,
      });
      this.setState((prev) => ({ ...prev, status: 'success', receipt }));
      this.analytics.track({
        name: 'predict_deposit_indicated',
        props: { status: receipt.status },
      });
      const owner = this.sessionService.getState().ownerAddress;
      if (owner) {
        // Refresh balance so the UI shows the prefunded amount.
        this.portfolio.refresh(owner).catch(() => undefined);
      }
      return receipt;
    } catch (err) {
      this.setError(err);
      return undefined;
    }
  }

  async submitWithdraw(args: {
    ownerAddress: string;
    amount: string;
    destinationAddress: string;
  }): Promise<FundingReceipt | undefined> {
    this.setState({ status: 'submitting' });
    try {
      const client = await this.sessionService.getClient(args.ownerAddress);
      const plan = await client.createWithdrawPlan({
        mode: 'fixed-amount',
        amount: args.amount,
        destinationAddress: args.destinationAddress,
      });
      if (plan.kind === 'unsupported') {
        throw new PredictError(
          PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY,
          'withdraw unsupported',
        );
      }
      if (plan.kind !== 'venue_api') {
        throw new PredictError(
          PredictErrorCode.UNKNOWN_ERROR,
          `unexpected withdraw plan: ${plan.kind}`,
        );
      }
      const receipt = await this.executor.execute({ kind: 'withdraw_venue_api', plan });
      this.setState({ status: 'success', plan, receipt });
      this.analytics.track({
        name: 'predict_withdraw_submitted',
        props: { transferId: receipt.venueReference },
      });
      this.portfolio.refresh(args.ownerAddress).catch(() => undefined);
      return receipt;
    } catch (err) {
      this.setError(err);
      return undefined;
    }
  }

  private setError(err: unknown): void {
    const code = err instanceof PredictError ? err.code : PredictErrorCode.UNKNOWN_ERROR;
    const message = err instanceof Error ? err.message : 'unknown error';
    this.setState((prev) => ({ ...prev, status: 'error', error: { code, message } }));
  }
}
