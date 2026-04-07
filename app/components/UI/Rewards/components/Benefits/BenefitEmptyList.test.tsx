import React from 'react';
import { render } from '@testing-library/react-native';
import BenefitEmptyList from './BenefitEmptyList';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

const mockUseTheme = jest.fn();
const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.empty-list': 'No benefits available yet',
  };
  return translations[key] || key;
});

jest.mock('../../../../../util/theme', () => ({
  useTheme: (...args: unknown[]) => mockUseTheme(...args),
}));

jest.mock('images/benefits/empty-state-icon-light.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { REWARDS_VIEW_SELECTORS: mockRewardsViewSelectors } =
    jest.requireActual('../../Views/RewardsView.constants');
  return {
    __esModule: true,
    default: (props: {
      width: number;
      height: number;
      testID?: string;
      name?: string;
    }) => {
      const resolvedTestID =
        props.testID ??
        (props.name === 'EmptyStateIconDark'
          ? mockRewardsViewSelectors.BENEFIT_EMPTY_DARK_ICON
          : mockRewardsViewSelectors.BENEFIT_EMPTY_LIGHT_ICON);
      return ReactActual.createElement(View, {
        ...props,
        testID: resolvedTestID,
      });
    },
  };
});

jest.mock('images/benefits/empty-state-icon-dark.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { REWARDS_VIEW_SELECTORS: mockRewardsViewSelectors } =
    jest.requireActual('../../Views/RewardsView.constants');
  return {
    __esModule: true,
    default: (props: {
      width: number;
      height: number;
      testID?: string;
      name?: string;
    }) => {
      const resolvedTestID =
        props.testID ??
        (props.name === 'EmptyStateIconDark'
          ? mockRewardsViewSelectors.BENEFIT_EMPTY_DARK_ICON
          : mockRewardsViewSelectors.BENEFIT_EMPTY_LIGHT_ICON);
      return ReactActual.createElement(View, {
        ...props,
        testID: resolvedTestID,
      });
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

describe('BenefitEmptyList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ themeAppearance: 'light' });
  });

  it('renders empty list message', () => {
    const { getByText } = render(<BenefitEmptyList />);

    expect(getByText('No benefits available yet')).toBeOnTheScreen();
    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.empty-list');
  });

  it('renders light icon when theme is light', () => {
    mockUseTheme.mockReturnValue({ themeAppearance: 'light' });
    const { getByTestId, queryByTestId } = render(<BenefitEmptyList />);
    const lightIcon = getByTestId(REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_LIGHT_ICON);

    expect(lightIcon).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_DARK_ICON),
    ).toBeNull();
    expect(lightIcon.props.width).toBe(72);
    expect(lightIcon.props.height).toBe(72);
  });

  it('renders dark icon when theme is dark', () => {
    mockUseTheme.mockReturnValue({ themeAppearance: 'dark' });
    const { getByTestId, queryByTestId } = render(<BenefitEmptyList />);
    const darkIcon = getByTestId(REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_DARK_ICON);

    expect(darkIcon).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.BENEFIT_EMPTY_LIGHT_ICON),
    ).toBeNull();
    expect(darkIcon.props.width).toBe(72);
    expect(darkIcon.props.height).toBe(72);
  });
});
