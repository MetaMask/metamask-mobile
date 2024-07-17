import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import LockScreen from './';
import Routes from '../../../constants/navigation/Routes';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
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
