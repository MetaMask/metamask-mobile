import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import LockScreen from './';
import Routes from '../../../constants/navigation/Routes';
import {
  createMockInternalAccount,
  createMockUUIDFromAddress,
} from '../../../selectors/accountsController.test';
import { AccountsControllerState } from '@metamask/accounts-controller';

const MOCK_ADDRESS = '0x43727620ca89a4fC2878De582A6AF7c5E4596b70';

const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);

const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS.toLocaleLowerCase(),
  'Account 1',
);

const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUUID]: internalAccount1,
    },
    selectedAccount: expectedUUID,
  },
};

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
          selectedAddress: MOCK_ADDRESS,
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('LockScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      LockScreen,
      { name: Routes.LOCK_SCREEN },
      { state: mockInitialState },
      { bioStateMachineId: '' },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
