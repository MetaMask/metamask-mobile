import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsTooltipBottomSheet, {
  REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR,
} from './RewardsTooltipBottomSheet';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

describe('RewardsTooltipBottomSheet', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when opted in and visible', () => {
    const { getByTestId, getByText } = render(
      <RewardsTooltipBottomSheet isOptedIn isVisible onClose={mockOnClose} />,
    );

    expect(
      getByTestId(REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR),
    ).toBeOnTheScreen();
    expect(getByText('earn.rewards.tooltip_title')).toBeOnTheScreen();
    expect(getByText('earn.rewards.tooltip_description')).toBeOnTheScreen();
    expect(getByText('earn.rewards.tooltip_opted_in_footer')).toBeOnTheScreen();
  });

  it('renders correctly when not opted in and visible', () => {
    const { getByTestId, getByText } = render(
      <RewardsTooltipBottomSheet
        isOptedIn={false}
        isVisible
        onClose={mockOnClose}
      />,
    );

    expect(
      getByTestId(REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR),
    ).toBeOnTheScreen();
    expect(getByText('earn.rewards.tooltip_title')).toBeOnTheScreen();
    expect(getByText('earn.rewards.tooltip_description')).toBeOnTheScreen();
    expect(
      getByText('earn.rewards.tooltip_not_opted_in_footer'),
    ).toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    const { queryByTestId } = render(
      <RewardsTooltipBottomSheet
        isOptedIn
        isVisible={false}
        onClose={mockOnClose}
      />,
    );

    expect(queryByTestId(REWARDS_TOOLTIP_BOTTOM_SHEET_SELECTOR)).toBeNull();
  });

  it('renders with hardcoded 5 points and per $100 suffix', () => {
    const { getByText } = render(
      <RewardsTooltipBottomSheet isOptedIn isVisible onClose={mockOnClose} />,
    );

    expect(
      getByText('5 points earn.rewards.tooltip_points_suffix'),
    ).toBeOnTheScreen();
  });

  it('renders custom header layout with close button', () => {
    const { getByText, getByTestId } = render(
      <RewardsTooltipBottomSheet isOptedIn isVisible onClose={mockOnClose} />,
    );

    expect(getByText('earn.rewards.tooltip_title')).toBeOnTheScreen();
    expect(getByTestId('rewards-tooltip-close-icon')).toBeOnTheScreen();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByText } = render(
      <RewardsTooltipBottomSheet isOptedIn isVisible onClose={mockOnClose} />,
    );

    const closeButton = getByText('earn.rewards.tooltip_close');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-rewards-tooltip';
    const { getByTestId } = render(
      <RewardsTooltipBottomSheet
        isOptedIn
        isVisible
        onClose={mockOnClose}
        testID={customTestID}
      />,
    );

    expect(getByTestId(customTestID)).toBeOnTheScreen();
  });
});
