import React from 'react';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import LockScreen from './index';
import Routes from '../../../constants/navigation/Routes';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { RootState } from '../../../reducers';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        securityAlertsEnabled: true,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockNavigation = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

describe('LockScreen', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      (props) => (
        <LockScreen
          {...props}
          navigation={mockNavigation}
          route={{ params: { bioStateMachineId: 'test-id' } }}
        />
      ),
      { name: Routes.LOCK_SCREEN },
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
