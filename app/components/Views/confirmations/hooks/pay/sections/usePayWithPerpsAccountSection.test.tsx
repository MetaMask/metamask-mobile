import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { PaymentOverride } from '@metamask/transaction-pay-controller';

import { LIGHTER_USDC_ASSET_ID } from '../../../temp-lighter/perps-lighter-transactions';
import { HYPERLIQUID_USDC_ASSET_ID } from '../../../utils/perps-balance-asset';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import {
  usePerpsTransferBalance,
  usePerpsTransferSource,
  usePerpsTransferTarget,
} from '../usePerpsTransferTarget';
import { useTransactionPayToken } from '../useTransactionPayToken';
import { useClearPaymentOverride } from './useClearPaymentOverride';
import {
  PAY_WITH_PERPS_ACCOUNT_ROW_TEST_ID,
  PAY_WITH_PERPS_ACCOUNT_SECTION_TEST_ID,
  usePayWithPerpsAccountSection,
} from './usePayWithPerpsAccountSection';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { balance?: string }) =>
    params?.balance ? `${key}:${params.balance}` : key,
}));
jest.mock('../../transactions/useTransactionMetadataRequest');
jest.mock('../usePerpsTransferTarget');
jest.mock('../useTransactionPayToken');
jest.mock('./useClearPaymentOverride');
describe('usePayWithPerpsAccountSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const goBackMock = jest.fn();
  const setPayTokenMock = jest.fn();
  const clearPaymentOverrideMock = jest.fn();
  let paymentOverride: PaymentOverride | undefined;
  let payTokenAssetId: string | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    paymentOverride = undefined;
    payTokenAssetId = undefined;
    jest.mocked(useNavigation).mockReturnValue({ goBack: goBackMock });
    jest
      .mocked(useTransactionMetadataRequest)
      .mockReturnValue({ id: 'tx-1', txParams: {} } as never);
    jest.mocked(usePerpsTransferTarget).mockReturnValue('lighter');
    jest.mocked(usePerpsTransferBalance).mockReturnValue('$4,718.18');
    jest
      .mocked(useClearPaymentOverride)
      .mockReturnValue(clearPaymentOverrideMock);
    jest.mocked(useTransactionPayToken).mockImplementation(
      () =>
        ({
          payToken: payTokenAssetId ? { assetId: payTokenAssetId } : undefined,
          setPayToken: setPayTokenMock,
        }) as never,
    );
    useSelectorMock.mockImplementation(() => paymentOverride);
  });

  it('returns null without a transfer target or source', () => {
    jest.mocked(usePerpsTransferTarget).mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithPerpsAccountSection());

    expect(result.current).toBeNull();
  });

  it('offers the other Perps account as the source of a Perps deposit', () => {
    jest.mocked(usePerpsTransferTarget).mockReturnValue(undefined);
    jest.mocked(usePerpsTransferSource).mockReturnValue('hyperliquid');

    const { result } = renderHook(() => usePayWithPerpsAccountSection());
    result.current?.rows[0].onPress?.();

    expect(result.current?.rows[0].title).toBe(
      'confirm.perps_withdraw_from.hyperliquid',
    );
    expect(usePerpsTransferBalance).toHaveBeenCalledWith('hyperliquid');
    expect(setPayTokenMock).toHaveBeenCalledWith({
      assetId: HYPERLIQUID_USDC_ASSET_ID,
    });
  });

  it('returns a section with the other Perps account', () => {
    const { result } = renderHook(() => usePayWithPerpsAccountSection());

    expect(result.current).toMatchObject({
      id: 'perps-account',
      testID: PAY_WITH_PERPS_ACCOUNT_SECTION_TEST_ID,
      rows: [
        {
          title: 'confirm.perps_withdraw_from.lighter',
          subtitle: 'confirm.pay_with_bottom_sheet.available_balance:$4,718.18',
          isSelected: false,
          trailingElement: 'none',
          testID: PAY_WITH_PERPS_ACCOUNT_ROW_TEST_ID,
        },
      ],
    });
  });

  it.each([
    ['lighter', LIGHTER_USDC_ASSET_ID],
    ['hyperliquid', HYPERLIQUID_USDC_ASSET_ID],
  ] as const)(
    'selects the %s balance as the pay token and closes the sheet',
    (target, assetId) => {
      jest.mocked(usePerpsTransferTarget).mockReturnValue(target);
      const { result } = renderHook(() => usePayWithPerpsAccountSection());

      result.current?.rows[0].onPress?.();

      expect(clearPaymentOverrideMock).toHaveBeenCalledTimes(1);
      expect(setPayTokenMock).toHaveBeenCalledWith({ assetId });
      expect(goBackMock).toHaveBeenCalledTimes(1);
    },
  );

  it('marks the row selected when its balance is the pay token', () => {
    payTokenAssetId = LIGHTER_USDC_ASSET_ID;

    const { result } = renderHook(() => usePayWithPerpsAccountSection());

    expect(result.current?.rows[0]).toMatchObject({
      isSelected: true,
      trailingElement: 'checkmark',
    });
  });

  it('does not mark the row selected while the Money account override is on', () => {
    payTokenAssetId = LIGHTER_USDC_ASSET_ID;
    paymentOverride = PaymentOverride.MoneyAccount;

    const { result } = renderHook(() => usePayWithPerpsAccountSection());

    expect(result.current?.rows[0].isSelected).toBe(false);
  });
});
