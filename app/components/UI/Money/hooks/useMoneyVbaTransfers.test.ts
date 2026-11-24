import { useQuery } from '@metamask/react-data-query';
import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';
import {
  selectMoneyVbaCompletedActivityEnabled,
  selectMoneyVbaPendingActivityEnabled,
} from '../selectors/featureFlags';
import { useMoneyVbaTransfers } from './useMoneyVbaTransfers';

jest.mock('@metamask/react-data-query', () => ({ useQuery: jest.fn() }));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUseQuery = jest.mocked(useQuery);
const mockUseSelector = jest.mocked(useSelector);
const ADDRESS = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';

function setup(
  options: {
    address?: string | undefined;
    completedEnabled?: boolean;
    pendingEnabled?: boolean;
  } = {},
) {
  const address = Object.hasOwn(options, 'address') ? options.address : ADDRESS;
  const completedEnabled = options.completedEnabled ?? true;
  const pendingEnabled = options.pendingEnabled ?? false;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }
    if (selector === selectMoneyVbaCompletedActivityEnabled) {
      return completedEnabled;
    }
    if (selector === selectMoneyVbaPendingActivityEnabled) {
      return pendingEnabled;
    }
    return undefined;
  });
  mockUseQuery.mockReturnValue({} as never);
}

describe('useMoneyVbaTransfers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('uses a wallet-scoped service action key and enables only with the gate', () => {
    useMoneyVbaTransfers();

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountApiDataServiceQueryKeys.FETCH_VBA_TRANSFERS,
        { address: ADDRESS.toLowerCase() },
      ],
      enabled: true,
    });
  });

  it('fetches when only pending activity is enabled', () => {
    setup({ completedEnabled: false, pendingEnabled: true });
    useMoneyVbaTransfers();

    expect(mockUseQuery.mock.calls[0][0]).toEqual(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('disables fetching when both activity gates are off', () => {
    setup({ completedEnabled: false, pendingEnabled: false });
    useMoneyVbaTransfers();

    expect(mockUseQuery.mock.calls[0][0]).toEqual(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables fetching when there is no active Money Account wallet', () => {
    setup({ address: undefined });
    useMoneyVbaTransfers();

    expect(mockUseQuery.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_VBA_TRANSFERS,
          { address: '' },
        ],
        enabled: false,
      }),
    );
  });
});
