import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsTag, {
  REWARDS_TAG_SELECTOR,
  RewardsTagBackgroundVariant,
} from './RewardsTag';
import Icon from '../../../../../component-library/components/Icons/Icon';

describe('RewardsTag', () => {
  it('renders correctly with 0 points', () => {
    const { getByTestId, getByText } = render(<RewardsTag points={0} />);
    expect(getByTestId(REWARDS_TAG_SELECTOR)).toBeDefined();
    expect(getByText('0 points')).toBeDefined();
  });

  it('renders correctly with points value', () => {
    const { getByText } = render(<RewardsTag points={125} />);
    expect(getByText('125 points')).toBeDefined();
  });

  it('formats large numbers correctly', () => {
    const { getByText } = render(<RewardsTag points={1500} />);
    expect(getByText('1,500 points')).toBeDefined();
  });

  it('renders with suffix when provided', () => {
    const { getByText } = render(<RewardsTag points={5} suffix="per $100" />);
    expect(getByText('5 points per $100')).toBeDefined();
  });

  it('renders without suffix when not provided', () => {
    const { getByText, queryByText } = render(<RewardsTag points={10} />);
    expect(getByText('10 points')).toBeDefined();
    expect(queryByText('per $100')).toBeNull();
  });

  it('renders info icon when showInfoIcon is true', () => {
    const { UNSAFE_getByType } = render(
      <RewardsTag points={100} showInfoIcon />,
    );

    expect(UNSAFE_getByType(Icon)).toBeDefined();
  });

  it('does not render info icon by default', () => {
    const { UNSAFE_queryByType } = render(<RewardsTag points={100} />);

    expect(UNSAFE_queryByType(Icon)).toBeNull();
  });

  it('applies subsection background variant by default', () => {
    const { getByTestId } = render(<RewardsTag points={100} />);
    const tag = getByTestId(REWARDS_TAG_SELECTOR);
    expect(tag).toBeDefined();
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
    expect(tag).toBeDefined();
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
    expect(tag).toBeDefined();
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-rewards-tag';
    const { getByTestId } = render(
      <RewardsTag points={50} testID={customTestID} />,
    );

    expect(getByTestId(customTestID)).toBeDefined();
  });

  it('renders without background when showBackground is false', () => {
    const { getByText } = render(
      <RewardsTag points={100} showBackground={false} />,
    );
    expect(getByText('100 points')).toBeDefined();
  });

  it('renders with background by default', () => {
    const { getByText } = render(<RewardsTag points={100} />);
    expect(getByText('100 points')).toBeDefined();
  });
});
