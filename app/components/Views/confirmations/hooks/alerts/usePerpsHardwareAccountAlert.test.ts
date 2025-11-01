import { renderHook } from '@testing-library/react-native';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';
import { isHardwareAccount } from '../../../../../util/address';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';

jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../util/address');

function runHook() {
  return renderHook(() => usePerpsHardwareAccountAlert());
}

describe('usePerpsHardwareAccountAlert', () => {
  const isHardwareAccountMock = jest.mocked(isHardwareAccount);

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
  });

  it('returns alert if from is hardware wallet account', () => {
    isHardwareAccountMock.mockReturnValue(true);

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.PerpsHardwareAccount,
        title: strings('alert_system.perps_hardware_account.title'),
        message: strings('alert_system.perps_hardware_account.message'),
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
});
