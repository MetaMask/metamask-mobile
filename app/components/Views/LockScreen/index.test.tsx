import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import LockScreen from './';
import Routes from '../../../constants/navigation/Routes';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        state: {
          securityAlertsEnabled: true,
          selectedAddress: '0x43727620ca89a4fC2878De582A6AF7c5E4596b70',
        },
      },
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
