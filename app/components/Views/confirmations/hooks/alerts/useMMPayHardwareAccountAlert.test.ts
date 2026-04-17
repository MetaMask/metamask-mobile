import { renderHook } from '@testing-library/react-native';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import { useMMPayHardwareAccountAlert } from './useMMPayHardwareAccountAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../util/address');

function runHook() {
  return renderHook(() => useMMPayHardwareAccountAlert());
}

describe('useMMPayHardwareAccountAlert', () => {
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);
  const isQRHardwareAccountMock = jest.mocked(isQRHardwareAccount);

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionMetadataRequestMock.mockReturnValue({
      txParams: {
        from: '0xabc',
      },
    } as TransactionMeta);

    isQRHardwareAccountMock.mockReturnValue(false);
  });

  it('returns alert if from is hardware wallet account', () => {
    isHardwareAccountMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.MMPayHardwareAccount,
        title: strings('alert_system.mmpay_hardware_account.title'),
        message: strings('alert_system.mmpay_hardware_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert if not hardware account', () => {
    isHardwareAccountMock.mockReturnValue(false);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns no alert for Ledger wallet on mUSD conversion', () => {
    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(false);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: {
        from: '0xabc',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });

  it('returns alert for QR wallet on mUSD conversion', () => {
    isHardwareAccountMock.mockReturnValue(true);
    isQRHardwareAccountMock.mockReturnValue(true);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
      txParams: {
        from: '0xabc',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.MMPayHardwareAccount,
        title: strings('alert_system.mmpay_hardware_account.title'),
        message: strings('alert_system.mmpay_hardware_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });
});
