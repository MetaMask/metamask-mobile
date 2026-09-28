import { renderHook, act } from '@testing-library/react-native';
import { useCashTokensRefresh } from './useCashTokensRefresh';
import { performEvmTokenRefresh } from '../../UI/Tokens/util/tokenRefreshUtils';
import Logger from '../../../util/Logger';

const mockAccounts = [{ id: 'account-1' }];
const mockChainIds = ['0x1', '0xe708'];

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(() => mockAccounts),
  }),
);

jest.mock('../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworks: jest.fn(() => mockChainIds),
}));

jest.mock('../../UI/Tokens/util/tokenRefreshUtils', () => ({
  performEvmTokenRefresh: jest.fn(() => Promise.resolve()),
}));

describe('useCashTokensRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets refreshing true during onRefresh and false after completion', async () => {
    const { result } = renderHook(() => useCashTokensRefresh());

    expect(result.current.refreshing).toBe(false);

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });

  it('refreshes tokens for the selected accounts and enabled chains', async () => {
    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(performEvmTokenRefresh).toHaveBeenCalledWith(
      mockAccounts,
      mockChainIds,
    );
  });

  it('flips refreshing back to false and logs when performEvmTokenRefresh rejects', async () => {
    (performEvmTokenRefresh as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useCashTokensRefresh());

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
    expect(loggerSpy).toHaveBeenCalled();

    loggerSpy.mockRestore();
  });
});
