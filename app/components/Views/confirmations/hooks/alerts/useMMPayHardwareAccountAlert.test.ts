import { renderHook } from '@testing-library/react-native';
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
import { isHardwareAccount } from '../../../../../util/address';
import { useMMPayHardwareAccountAlert } from './useMMPayHardwareAccountAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../pay/useTransactionPayData');
jest.mock('../../../../../util/address');

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

    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
      txParams: {
        from: HARDWARE_ADDRESS,
      },
    } as TransactionMeta);
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
});
