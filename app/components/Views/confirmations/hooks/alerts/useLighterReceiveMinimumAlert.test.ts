import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionPayTotals } from '@metamask/transaction-pay-controller';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayTotals } from '../pay/useTransactionPayData';
import { LIGHTER_USDC_ASSET_ID } from '../../temp-lighter/perps-lighter-transactions';
import { HYPERLIQUID_USDC_ASSET_ID } from '../../utils/perps-balance-asset';
import { useLighterReceiveMinimumAlert } from './useLighterReceiveMinimumAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../pay/useTransactionPayToken');
jest.mock('../pay/useTransactionPayData');

function runHook({
  type,
  payTokenAssetId,
  receivedUsd,
}: {
  type: TransactionType;
  payTokenAssetId: string | undefined;
  receivedUsd: string | undefined;
}) {
  jest.mocked(useTransactionMetadataRequest).mockReturnValue({
    txParams: { from: '0x0' },
    type,
  } as unknown as TransactionMeta);

  jest.mocked(useTransactionPayToken).mockReturnValue({
    payToken: payTokenAssetId ? { assetId: payTokenAssetId } : undefined,
    setPayToken: jest.fn(),
  } as unknown as ReturnType<typeof useTransactionPayToken>);

  jest
    .mocked(useTransactionPayTotals)
    .mockReturnValue(
      (receivedUsd === undefined
        ? undefined
        : { targetAmount: { usd: receivedUsd, fiat: receivedUsd } }) as
        | TransactionPayTotals
        | undefined,
    );

  return renderHookWithProvider(() => useLighterReceiveMinimumAlert());
}

describe('useLighterReceiveMinimumAlert', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    [
      'a Lighter deposit paid from Hyperliquid',
      TransactionType.perpsLighterDeposit,
      HYPERLIQUID_USDC_ASSET_ID,
    ],
    [
      'a Hyperliquid withdraw to Lighter',
      TransactionType.perpsWithdraw,
      LIGHTER_USDC_ASSET_ID,
    ],
  ])(
    'blocks %s that would deliver less than 1 USD',
    (_title, type, payTokenAssetId) => {
      const { result } = runHook({
        type,
        payTokenAssetId,
        receivedUsd: '0.979718',
      });

      expect(result.current).toEqual([
        {
          key: AlertKeys.FiatBuyAmountLimit,
          field: RowAlertKey.Amount,
          title: strings('alert_system.fiat_buy_amount_limit.title'),
          message: strings('alert_system.pay_amount_too_low.message'),
          severity: Severity.Danger,
          isBlocking: true,
        },
      ]);
    },
  );

  it.each(['1', '1.979438'])(
    'returns no alert when %s USD would arrive',
    (receivedUsd) => {
      const { result } = runHook({
        type: TransactionType.perpsLighterDeposit,
        payTokenAssetId: HYPERLIQUID_USDC_ASSET_ID,
        receivedUsd,
      });

      expect(result.current).toStrictEqual([]);
    },
  );

  it.each([undefined, '0'])(
    'returns no alert without a quoted amount (%s)',
    (receivedUsd) => {
      const { result } = runHook({
        type: TransactionType.perpsLighterDeposit,
        payTokenAssetId: HYPERLIQUID_USDC_ASSET_ID,
        receivedUsd,
      });

      expect(result.current).toStrictEqual([]);
    },
  );

  it.each([
    [
      'a Lighter deposit paid from a token',
      TransactionType.perpsLighterDeposit,
      'eip155:1/erc20:0xabc',
    ],
    [
      'a Hyperliquid withdraw to a token',
      TransactionType.perpsWithdraw,
      'eip155:42161/erc20:0xabc',
    ],
    [
      'a Hyperliquid deposit paid from Lighter',
      TransactionType.perpsDeposit,
      LIGHTER_USDC_ASSET_ID,
    ],
    [
      'a Lighter withdraw to Hyperliquid',
      TransactionType.perpsLighterWithdraw,
      HYPERLIQUID_USDC_ASSET_ID,
    ],
  ])('returns no alert for %s', (_title, type, payTokenAssetId) => {
    const { result } = runHook({
      type,
      payTokenAssetId,
      receivedUsd: '0.5',
    });

    expect(result.current).toStrictEqual([]);
  });
});
