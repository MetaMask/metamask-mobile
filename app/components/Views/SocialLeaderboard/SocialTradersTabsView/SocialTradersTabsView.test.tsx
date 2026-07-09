import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialTradersTabsView from './SocialTradersTabsView';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (props: { children?: React.ReactNode }, _ref: React.Ref<unknown>) => (
      <View>{props.children}</View>
    ),
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: () => ({
      hasNotificationPreferences: false,
      isLoading: false,
    }),
  }),
);

jest.mock('../TopTradersView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-top-traders" />,
  };
});

jest.mock('../FeedView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-feed" />,
  };
});

describe('SocialTradersTabsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header, tabs, and both pages', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.TABS),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-top-traders')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-feed')).toBeOnTheScreen();
  });

  it('plays a selection haptic when switching to a different tab', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('does not play a haptic when pressing the already-active tab', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-0`),
    );

    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
