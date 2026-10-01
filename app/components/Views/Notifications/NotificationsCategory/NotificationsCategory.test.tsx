import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import NotificationsCategory from './NotificationsCategory';
import { NotificationsCategorySelectorsIDs } from './NotificationsCategory.testIds';
import type { NotificationCategoryMetadata } from '../../../../util/notifications/categories';

let mockIsMetamaskNotificationsEnabled = true;
let mockIsSocialLeaderboardEnabled = false;
let mockCategories: NotificationCategoryMetadata[] = [
  {
    category_id: 'walletActivity',
    aus_keys: ['walletActivity'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'perps',
    aus_keys: ['perps'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'socialAI',
    aus_keys: ['socialAI'],
    visible_on: [],
    notification_types: [],
  },
  {
    category_id: 'marketing',
    aus_keys: ['marketing'],
    visible_on: [],
    notification_types: [],
  },
];
let mockIsLoading = false;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: () =>
    mockIsMetamaskNotificationsEnabled,
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: () => mockIsSocialLeaderboardEnabled,
  }),
);

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useNotificationsCategories: () => ({
    categoriesData: mockCategories,
    isLoading: mockIsLoading,
  }),
}));

describe('NotificationsCategory', () => {
  beforeEach(() => {
    mockIsMetamaskNotificationsEnabled = true;
    mockIsSocialLeaderboardEnabled = false;
    mockIsLoading = false;
    mockCategories = [
      {
        category_id: 'walletActivity',
        aus_keys: ['walletActivity'],
        visible_on: [],
        notification_types: [],
      },
      {
        category_id: 'perps',
        aus_keys: ['perps'],
        visible_on: [],
        notification_types: [],
      },
      {
        category_id: 'socialAI',
        aus_keys: ['socialAI'],
        visible_on: [],
        notification_types: [],
      },
      {
        category_id: 'marketing',
        aus_keys: ['marketing'],
        visible_on: [],
        notification_types: [],
      },
    ];
  });

  it('renders the All tab plus one tab per catalog category', () => {
    const { getByTestId, queryByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={jest.fn()} />,
    );

    expect(getByTestId(NotificationsCategorySelectorsIDs.ALL)).toBeTruthy();
    expect(getByTestId('notifications-category-walletActivity')).toBeTruthy();
    expect(getByTestId('notifications-category-perps')).toBeTruthy();
    expect(getByTestId('notifications-category-marketing')).toBeTruthy();
    expect(queryByTestId('notifications-category-socialAI')).toBeNull();
  });

  it('shows the socialAI tab when the social leaderboard flag is enabled', () => {
    mockIsSocialLeaderboardEnabled = true;

    const { getByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={jest.fn()} />,
    );

    expect(getByTestId('notifications-category-socialAI')).toBeTruthy();
  });

  it('calls onSelect with the categoryId when a tab is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={onSelect} />,
    );

    fireEvent(getByTestId('notifications-category-perps'), 'onPress');

    expect(onSelect).toHaveBeenCalledWith('perps');
  });

  it('renders a loading skeleton while categories are loading', () => {
    mockIsLoading = true;

    const { queryByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={jest.fn()} />,
    );

    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.CONTAINER),
    ).toBeNull();
    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.SKELETON),
    ).toBeTruthy();
  });

  it('renders neither tabs nor a skeleton while loading if notifications are disabled', () => {
    mockIsLoading = true;
    mockIsMetamaskNotificationsEnabled = false;

    const { queryByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={jest.fn()} />,
    );

    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.SKELETON),
    ).toBeNull();
  });

  it('renders nothing when MetaMask notifications are disabled', () => {
    mockIsMetamaskNotificationsEnabled = false;

    const { queryByTestId } = render(
      <NotificationsCategory selectedCategory="all" onSelect={jest.fn()} />,
    );

    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
