import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
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

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../util/address');

const useSelectorMock = jest.mocked(useSelector);

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

  beforeEach(() => {
    jest.resetAllMocks();

    useSelectorMock.mockReturnValue({ enabled: false });

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

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });

  it('returns no alert if not hardware account', () => {
    isHardwareAccountMock.mockReturnValue(false);

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
        from: '0xabc',
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
        from: '0xabc',
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
        from: '0xabc',
      },
    } as TransactionMeta);

    const { result } = runHook();

    expect(result.current).toStrictEqual([EXPECTED_ALERT]);
  });
});
