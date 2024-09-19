import React from 'react';
import NotificationsView from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { createStackNavigator } from '@react-navigation/stack';

const navigationMock = {
  navigate: jest.fn(),
} as unknown as NavigationProp<ParamListBase>;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({})),
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        metamaskNotificationsList: [],
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

const Stack = createStackNavigator();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name={Routes.NOTIFICATIONS.VIEW} options={{}}>
        {(props) => (
          <NotificationsView
            {...props}
            navigation={navigationMock}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('NotificationsView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderComponent({});
    expect(toJSON()).toMatchSnapshot();
  });
});
