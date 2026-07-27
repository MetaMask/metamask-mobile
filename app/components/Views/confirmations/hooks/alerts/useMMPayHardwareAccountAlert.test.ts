import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { useMMPayHardwareAccountAlert } from './useMMPayHardwareAccountAlert';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../pay/useTransactionPayData');
jest.mock('../../../../../util/address');

const useSelectorMock = jest.mocked(useSelector);

const HARDWARE_ADDRESS = '0xabc';
const OVERRIDE_ADDRESS = '0xdef';

function runHook() {
  return renderHook(() => useMMPayHardwareAccountAlert());
}

const EXPECTED_ALERT = {
  key: AlertKeys.MMPayHardwareAccount,
  title: strings('alert_system.mmpay_hardware_account.title'),
  message: strings('alert_system.mmpay_hardware_account.message'),
  severity: Severity.Danger,
  isBlocking: true,
};

describe('useMMPayHardwareAccountAlert', () => {
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const isQRHardwareAccountMock = jest.mocked(isQRHardwareAccount);

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionAccountOverrideMock = jest.mocked(
    useTransactionAccountOverride,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useSelectorMock.mockReturnValue({ enabled: false });
    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);

    isQRHardwareAccountMock.mockReturnValue(false);
  });

  it('returns alert if from is hardware wallet account', () => {
    isHardwareAccountMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('returns no alert if not hardware account', () => {
    isHardwareAccountMock.mockReturnValue(false);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert if transaction is not a pay transaction', () => {
    isHardwareAccountMock.mockReturnValue(true);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('checks account override instead of from when set', () => {
    isHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: {
        from: '0x123',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
    expect(isHardwareAccountMock).toHaveBeenCalledWith(OVERRIDE_ADDRESS);
  });

  it('returns no alert on withdraw when account override is hardware account', () => {
    isHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: {
        from: '0x123',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert when fiat payment method is selected', () => {
    isHardwareAccountMock.mockReturnValue(true);
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'payment-method-1',
    } as ReturnType<typeof useTransactionPayFiatPayment>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for Ledger wallet on mUSD conversion when feature flag is disabled', () => {
    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(false);
    useSelectorMock.mockReturnValue({ enabled: false });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('returns no alert for Ledger wallet on mUSD conversion when feature flag is enabled', () => {
    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(false);
    useSelectorMock.mockReturnValue({ enabled: true });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for QR wallet on mUSD conversion even when feature flag is enabled', () => {
    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(true);
    useSelectorMock.mockReturnValue({ enabled: true });
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });
});
