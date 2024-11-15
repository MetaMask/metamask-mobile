import React from 'react';
import NotificationsView from './';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';

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

describe('NotificationsView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NotificationsView navigation={navigationMock} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
