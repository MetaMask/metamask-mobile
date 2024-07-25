// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ProfileSyncingModal from './ProfileSyncingModal';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const MOCK_STORE_STATE = {
  engine: {
    backgroundState: {
      NotificationServicesController: {
        isNotificationServicesEnabled: true,
      },
      UserStorageController: {
        isProfileSyncingEnabled: true,
      },
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: (state: unknown) => unknown) => fn(MOCK_STORE_STATE),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

describe('ProfileSyncingModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <ProfileSyncingModal navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
