import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import NotificationsCategory from './NotificationsCategory';
import { NotificationsCategorySelectorsIDs } from './NotificationsCategory.testIds';

let mockIsMetamaskNotificationsEnabled = true;
let mockIsSocialLeaderboardEnabled = false;
let mockIsPriceAlertsEnabled = false;
let mockCategories: Array<{ categoryId: string; ausKeys: string[] }> = [
  { categoryId: 'walletActivity', ausKeys: ['walletActivity'] },
  { categoryId: 'perps', ausKeys: ['perps'] },
  { categoryId: 'socialAI', ausKeys: ['socialAI'] },
  { categoryId: 'marketing', ausKeys: ['marketing'] },
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

jest.mock('../../../../selectors/featureFlagController/priceAlerts', () => ({
  selectPriceAlertsEnabled: () => mockIsPriceAlertsEnabled,
}));

jest.mock('../../../../util/notifications/categories', () => ({
  ...jest.requireActual('../../../../util/notifications/categories'),
  useNotificationCategories: () => ({
    categories: mockCategories,
    isLoading: mockIsLoading,
  }),
}));

describe('NotificationsCategory', () => {
  beforeEach(() => {
    mockIsMetamaskNotificationsEnabled = true;
    mockIsSocialLeaderboardEnabled = false;
    mockIsPriceAlertsEnabled = false;
    mockIsLoading = false;
    mockCategories = [
      { categoryId: 'walletActivity', ausKeys: ['walletActivity'] },
      { categoryId: 'perps', ausKeys: ['perps'] },
      { categoryId: 'socialAI', ausKeys: ['socialAI'] },
      { categoryId: 'marketing', ausKeys: ['marketing'] },
    ];
  });

  it('renders the All tab plus one tab per catalog category', () => {
    const { getByTestId, queryByTestId } = render(
      <NotificationsCategory onSelect={jest.fn()} />,
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
      <NotificationsCategory onSelect={jest.fn()} />,
    );

    expect(getByTestId('notifications-category-socialAI')).toBeTruthy();
  });

  it('calls onSelect with the categoryId when a tab is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <NotificationsCategory onSelect={onSelect} />,
    );

    fireEvent(getByTestId('notifications-category-perps'), 'onPress');

    expect(onSelect).toHaveBeenCalledWith('perps');
  });

  it('renders a loading skeleton while categories are loading', () => {
    mockIsLoading = true;

    const { queryByTestId } = render(
      <NotificationsCategory onSelect={jest.fn()} />,
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
      <NotificationsCategory onSelect={jest.fn()} />,
    );

    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.SKELETON),
    ).toBeNull();
  });

  it('renders nothing when MetaMask notifications are disabled', () => {
    mockIsMetamaskNotificationsEnabled = false;

    const { queryByTestId } = render(
      <NotificationsCategory onSelect={jest.fn()} />,
    );

    expect(
      queryByTestId(NotificationsCategorySelectorsIDs.CONTAINER),
    ).toBeNull();
  });
});
