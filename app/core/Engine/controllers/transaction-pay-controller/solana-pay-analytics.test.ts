import type { SolanaPayLifecyclePayload } from '@metamask/transaction-pay-controller';

import { MetaMetricsEvents } from '../../../Analytics';
import { buildAndTrackEvent } from '../../utils/analytics';
import type { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger/transaction-pay-controller-messenger';
import {
  getSolanaPayLifecycleProperties,
  trackSolanaPayLifecycle,
} from './solana-pay-analytics';

jest.mock('../../utils/analytics');

const LIFECYCLE_PAYLOAD: SolanaPayLifecyclePayload = {
  errorCode: 'settlement_status_unknown',
  followUpStatus: 'not-required',
  followUpTransactionIdPresent: false,
  isRecovery: true,
  notificationStatus: 'failure',
  outcome: 'unknown',
  phase: 'unknown',
  provider: 'relay',
  relayStatus: 'unknown',
  requestIdPresent: true,
  sourceAssetClass: 'native',
  sourceStatus: 'confirmed',
  sourceTransactionIdPresent: true,
  targetTransactionIdPresent: false,
};

describe('getSolanaPayLifecycleProperties', () => {
  it('maps Core lifecycle facts to privacy-safe MetaMask Pay properties', () => {
    const result = getSolanaPayLifecycleProperties(LIFECYCLE_PAYLOAD);

    expect(result).toStrictEqual({
      mm_pay_error_code: 'settlement_status_unknown',
      mm_pay_follow_up_status: 'not-required',
      mm_pay_follow_up_transaction_id_present: false,
      mm_pay_is_recovery: true,
      mm_pay_notification_status: 'failure',
      mm_pay_outcome: 'unknown',
      mm_pay_phase: 'unknown',
      mm_pay_provider: 'relay',
      mm_pay_relay_status: 'unknown',
      mm_pay_request_id_present: true,
      mm_pay_source_asset_class: 'native',
      mm_pay_source_status: 'confirmed',
      mm_pay_source_transaction_id_present: true,
      mm_pay_target_transaction_id_present: false,
    });
  });

  it('omits the optional error classification when unavailable', () => {
    const { errorCode: _errorCode, ...payload } = LIFECYCLE_PAYLOAD;

    const result = getSolanaPayLifecycleProperties(payload);

    expect(result).not.toHaveProperty('mm_pay_error_code');
  });
});

describe('trackSolanaPayLifecycle', () => {
  it('tracks the central lifecycle event through the init messenger', () => {
    const initMessenger = {} as TransactionPayControllerInitMessenger;

    trackSolanaPayLifecycle(initMessenger, LIFECYCLE_PAYLOAD);

    expect(buildAndTrackEvent).toHaveBeenCalledWith(
      initMessenger,
      MetaMetricsEvents.METAMASK_PAY_SOLANA_LIFECYCLE,
      getSolanaPayLifecycleProperties(LIFECYCLE_PAYLOAD),
    );
  });
});
