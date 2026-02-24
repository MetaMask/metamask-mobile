import { useBurnAddressAlert } from './useBurnAddressAlert';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useNestedTransactionTransferRecipients,
  useTransferRecipient,
} from '../transactions/useTransferRecipient';
import { Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';

jest.mock('../transactions/useTransferRecipient');

describe('useBurnAddressAlert', () => {
  const BURN_ADDRESS_1 = '0x0000000000000000000000000000000000000000';
  const BURN_ADDRESS_2 = '0x000000000000000000000000000000000000dead';
  const NORMAL_ADDRESS = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    (useTransferRecipient as jest.Mock).mockReturnValue(undefined);
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([]);
  });

  it('returns empty array when no recipient addresses are present', () => {
    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when transaction recipient is a normal address', () => {
    (useTransferRecipient as jest.Mock).mockReturnValue(NORMAL_ADDRESS);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when nested transaction recipients are normal addresses', () => {
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([
      NORMAL_ADDRESS,
      '0xabcdef1234567890abcdef1234567890abcdef12',
    ]);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toEqual([]);
  });

  it('returns burn address alert when transaction recipient is first burn address', () => {
    (useTransferRecipient as jest.Mock).mockReturnValue(BURN_ADDRESS_1);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.BurnAddress,
      field: RowAlertKey.FromToAddress,
      severity: Severity.Danger,
      isBlocking: true,
    });
    expect(result.current[0].title).toBeDefined();
    expect(result.current[0].message).toBeDefined();
  });

  it('returns burn address alert when transaction recipient is second burn address', () => {
    (useTransferRecipient as jest.Mock).mockReturnValue(BURN_ADDRESS_2);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.BurnAddress,
      field: RowAlertKey.FromToAddress,
      severity: Severity.Danger,
      isBlocking: true,
    });
  });

  it('returns burn address alert when transaction recipient is burn address with uppercase letters', () => {
    (useTransferRecipient as jest.Mock).mockReturnValue(
      '0x0000000000000000000000000000000000000000'.toUpperCase(),
    );

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.BurnAddress);
  });

  it('returns burn address alert when nested transaction contains burn address', () => {
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([
      NORMAL_ADDRESS,
      BURN_ADDRESS_1,
    ]);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: AlertKeys.BurnAddress,
      field: RowAlertKey.FromToAddress,
      severity: Severity.Danger,
      isBlocking: true,
    });
  });

  it('returns burn address alert when nested transaction contains burn address with mixed case', () => {
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([
      '0x000000000000000000000000000000000000dEaD',
    ]);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.BurnAddress);
  });

  it('returns single burn address alert when both transaction and nested transactions contain burn addresses', () => {
    (useTransferRecipient as jest.Mock).mockReturnValue(BURN_ADDRESS_1);
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([
      BURN_ADDRESS_2,
    ]);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.BurnAddress);
  });

  it('returns single burn address alert when nested transactions contain multiple burn addresses', () => {
    (useNestedTransactionTransferRecipients as jest.Mock).mockReturnValue([
      BURN_ADDRESS_1,
      NORMAL_ADDRESS,
      BURN_ADDRESS_2,
    ]);

    const { result } = renderHookWithProvider(() => useBurnAddressAlert());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe(AlertKeys.BurnAddress);
  });
});
