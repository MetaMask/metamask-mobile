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

const HARDWARE_PAY_DISABLED = false;
const HARDWARE_PAY_ENABLED = true;

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

    useSelectorMock.mockReturnValue(HARDWARE_PAY_DISABLED);
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

  it.each([
    {
      address: '0x3333333333333333333333333333333333333333' as const,
      isQr: false,
      label: 'Ledger',
    },
    {
      address: '0x4444444444444444444444444444444444444444' as const,
      isQr: true,
      label: 'QR',
    },
    {
      address: '0x5555555555555555555555555555555555555555' as const,
      isQr: true,
      label: 'OneKey',
    },
  ])(
    'returns no alert on money account withdraw when account override is a $label hardware recipient',
    ({ address, isQr }) => {
      const moneyAccountAddress = '0x1111111111111111111111111111111111111111';
      isHardwareAccountMock.mockImplementation((addr) => addr === address);
      isQRHardwareAccountMock.mockImplementation(
        (addr) => isQr && addr === address,
      );
      useTransactionAccountOverrideMock.mockReturnValue(address);
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {
          from: moneyAccountAddress,
        },
      } as TransactionMeta);

      const { result } = runHook();

      expect(result.current).toStrictEqual([]);
      expect(isHardwareAccountMock).toHaveBeenCalledWith(moneyAccountAddress);
      expect(isHardwareAccountMock).not.toHaveBeenCalledWith(address);
      expect(isQRHardwareAccountMock).toHaveBeenCalledWith(moneyAccountAddress);
      expect(isQRHardwareAccountMock).not.toHaveBeenCalledWith(address);
    },
  );

  it('returns no alert on money account withdraw when account override is a non-hardware recipient', () => {
    const moneyAccountAddress = '0x1111111111111111111111111111111111111111';
    const softwareRecipient = '0x2222222222222222222222222222222222222222';
    isHardwareAccountMock.mockReturnValue(false);
    useTransactionAccountOverrideMock.mockReturnValue(softwareRecipient);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: {
        from: moneyAccountAddress,
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
    expect(isHardwareAccountMock).toHaveBeenCalledWith(moneyAccountAddress);
  });

  it('returns no alert when fiat payment method is selected', () => {
    isHardwareAccountMock.mockReturnValue(true);
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'payment-method-1',
    } as ReturnType<typeof useTransactionPayFiatPayment>);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert for Ledger paying account on money account deposit when feature flag is enabled', () => {
    isHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    isQRHardwareAccountMock.mockReturnValue(false);
    useSelectorMock.mockReturnValue(HARDWARE_PAY_ENABLED);
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: {
        from: '0x123',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for QR paying account on money account deposit when feature flag is enabled', () => {
    isHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    isQRHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    useSelectorMock.mockReturnValue(HARDWARE_PAY_ENABLED);
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: {
        from: '0x123',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('returns alert for Ledger paying account on money account deposit when deposit type is not enabled', () => {
    isHardwareAccountMock.mockImplementation(
      (address) => address === OVERRIDE_ADDRESS,
    );
    isQRHardwareAccountMock.mockReturnValue(false);
    useSelectorMock.mockReturnValue(HARDWARE_PAY_DISABLED);
    useTransactionAccountOverrideMock.mockReturnValue(OVERRIDE_ADDRESS);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: {
        from: '0x123',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });
});
