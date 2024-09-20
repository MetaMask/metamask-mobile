import React from 'react';
import NotificationsView from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../../../component-library/components/Icons/Icon';

const mockNavigate = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

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
            navigation={{
              navigate: mockNavigate,
              setOptions: mockSetNavigationOptions,
            } as unknown as NavigationProp<ParamListBase>}
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

    it('should render correct header', () => {
      const navigation = {
        navigate: jest.fn(),
      } as unknown as NavigationProp<Record<string, undefined>>;
      const navigationOptions = NotificationsView.navigationOptions({
        navigation,
      });
      const { headerRight, headerLeft, headerTitle } = navigationOptions;

      expect(headerRight().props.iconName).toBe(IconName.Setting);
      expect(headerLeft().props.iconName).toBe(IconName.Close);
      expect(headerTitle().props.children).toBe(
        strings('app_settings.notifications_title'),
      );
    });
  });
