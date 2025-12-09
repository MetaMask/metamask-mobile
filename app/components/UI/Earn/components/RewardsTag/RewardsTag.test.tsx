import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsTag, {
  REWARDS_TAG_SELECTOR,
  REWARDS_TAG_INFO_ICON_SELECTOR,
  RewardsTagBackgroundVariant,
} from './RewardsTag';

describe('RewardsTag', () => {
  it('renders correctly with 0 points', () => {
    const { getByTestId, getByText } = render(<RewardsTag points={0} />);
    expect(getByTestId(REWARDS_TAG_SELECTOR)).toBeOnTheScreen();
    expect(getByText('0 points')).toBeOnTheScreen();
  });

  it('renders correctly with points value', () => {
    const { getByText } = render(<RewardsTag points={125} />);
    expect(getByText('125 points')).toBeOnTheScreen();
  });

  it('formats large numbers correctly', () => {
    const { getByText } = render(<RewardsTag points={1500} />);
    expect(getByText('1,500 points')).toBeOnTheScreen();
  });

  it('renders with suffix when provided', () => {
    const { getByText } = render(<RewardsTag points={5} suffix="per $100" />);
    expect(getByText('5 points per $100')).toBeOnTheScreen();
  });

  it('renders without suffix when not provided', () => {
    const { getByText, queryByText } = render(<RewardsTag points={10} />);
    expect(getByText('10 points')).toBeOnTheScreen();
    expect(queryByText('per $100')).toBeNull();
  });

  it('renders info icon when showInfoIcon is true', () => {
    const { getByTestId } = render(<RewardsTag points={100} showInfoIcon />);

    expect(getByTestId(REWARDS_TAG_INFO_ICON_SELECTOR)).toBeOnTheScreen();
  });

  it('does not render info icon by default', () => {
    const { queryByTestId } = render(<RewardsTag points={100} />);

    expect(queryByTestId(REWARDS_TAG_INFO_ICON_SELECTOR)).toBeNull();
  });

  it('applies subsection background variant by default', () => {
    const { getByTestId } = render(<RewardsTag points={100} />);
    const tag = getByTestId(REWARDS_TAG_SELECTOR);
    expect(tag).toBeOnTheScreen();
    // Default variant is subsection
  });

  it('applies muted background variant when specified', () => {
    const { getByTestId } = render(
      <RewardsTag
        points={100}
        backgroundVariant={RewardsTagBackgroundVariant.Muted}
      />,
    );
    const tag = getByTestId(REWARDS_TAG_SELECTOR);
    expect(tag).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <RewardsTag points={100} onPress={mockOnPress} />,
    );

    fireEvent.press(getByTestId(REWARDS_TAG_SELECTOR));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders as non-pressable when onPress is not provided', () => {
    const { getByTestId } = render(<RewardsTag points={100} />);
    const tag = getByTestId(REWARDS_TAG_SELECTOR);
    expect(tag).toBeOnTheScreen();
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-rewards-tag';
    const { getByTestId } = render(
      <RewardsTag points={50} testID={customTestID} />,
    );

    expect(getByTestId(customTestID)).toBeOnTheScreen();
  });

  it('renders without background when showBackground is false', () => {
    const { getByText } = render(
      <RewardsTag points={100} showBackground={false} />,
    );
    expect(getByText('100 points')).toBeOnTheScreen();
  });

  it('renders with background by default', () => {
    const { getByText } = render(<RewardsTag points={100} />);
    expect(getByText('100 points')).toBeOnTheScreen();
  });
});
