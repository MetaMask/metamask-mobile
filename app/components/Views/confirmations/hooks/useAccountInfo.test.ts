import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../../reducers';
import useAccountInfo from './useAccountInfo';

jest.mock('../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

const MOCK_ADDRESS = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accounts: {
          [MOCK_ADDRESS]: {
            balance: '0x5',
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: DeepPartial<RootState>) => unknown) =>
    fn(mockInitialState),
}));

describe('useAccountInfo', () => {
  it('should return existing address from accounts controller', async () => {
    const { result } = renderHookWithProvider(
      () => useAccountInfo(MOCK_ADDRESS),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current?.accountName).toEqual('Account 1');
    expect(result?.current?.accountAddress).toEqual('0x0');
    expect(result?.current?.accountBalance).toEqual('< 0.00001 ETH');
    expect(result?.current?.accountFiatBalance).toEqual('$10.00');
  });
});
