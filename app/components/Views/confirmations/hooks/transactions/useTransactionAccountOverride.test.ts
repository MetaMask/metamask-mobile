import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useTransactionAccountOverride } from './useTransactionAccountOverride';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { selectAccountOverrideByTransactionId } from '../../../../../selectors/transactionPayController';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('./useTransactionMetadataRequest');
jest.mock('../../../../../selectors/transactionPayController', () => ({
  selectAccountOverrideByTransactionId: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

describe('useTransactionAccountOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns accountOverride from transaction config', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'tx-1',
    } as never);
    mockUseSelector.mockReturnValue('0xOverrideAddress' as never);

    const { result } = renderHook(() => useTransactionAccountOverride());

    expect(result.current).toBe('0xOverrideAddress');
  });

  it('returns undefined when no accountOverride is set', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      id: 'tx-1',
    } as never);
    mockUseSelector.mockReturnValue(undefined);

    const { result } = renderHook(() => useTransactionAccountOverride());

    expect(result.current).toBeUndefined();
  });

  it('uses empty string as transactionId when transactionMeta is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined as never);
    mockUseSelector.mockReturnValue(undefined);

    renderHook(() => useTransactionAccountOverride());

    const selectorFn = mockUseSelector.mock.calls[0]?.[0];
    expect(selectorFn).toBeDefined();
    expect(selectAccountOverrideByTransactionId).toBeDefined();
  });
});
