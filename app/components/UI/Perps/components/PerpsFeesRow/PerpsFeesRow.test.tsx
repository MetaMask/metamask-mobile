import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { colors } from '../../../../../styles/common';
import PerpsFeesRow from './PerpsFeesRow';

jest.mock('../../../shared/MembershipVipBadge/MembershipVipBadge', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ hasProEntitlement }: { hasProEntitlement?: boolean }) =>
      MockReact.createElement(View, {
        testID: hasProEntitlement
          ? 'rewards-member-badge'
          : 'rewards-vip-badge',
      }),
  };
});

const ROW = 'fees-row';
const VALUE = 'fees-value';
const INFO = 'fees-info';
const CHIP = `${ROW}-member-chip`;

const renderRow = (props: Partial<React.ComponentProps<typeof PerpsFeesRow>>) =>
  render(
    <PerpsFeesRow
      testID={ROW}
      valueTestID={VALUE}
      infoButtonTestID={INFO}
      {...props}
    />,
  );

describe('PerpsFeesRow', () => {
  it('shows the total fee in dollars for a non-member', () => {
    renderRow({ fee: 2.9, originalFee: 2.9, onInfoPress: jest.fn() });

    expect(screen.getByText('Fees')).toBeOnTheScreen();
    expect(screen.queryByTestId(CHIP)).not.toBeOnTheScreen();
    expect(screen.getByTestId(VALUE)).toHaveTextContent('$2.90');
    expect(screen.queryByTestId(`${VALUE}-original`)).not.toBeOnTheScreen();
    expect(screen.getByTestId(ROW).props.accessibilityLabel).toBe(
      'Fees, $2.90. About fees',
    );
  });

  it('shows <$0.01 for a tiny fee', () => {
    renderRow({ fee: 0.004 });

    expect(screen.getByTestId(VALUE)).toHaveTextContent('<$0.01');
  });

  it('shows the placeholder when there is no fee yet', () => {
    renderRow({ fee: undefined, placeholder: '--' });

    expect(screen.getByTestId(VALUE)).toHaveTextContent('--');
  });

  it('shows a skeleton while loading', () => {
    renderRow({ fee: 2.9, isLoading: true });

    expect(screen.getByTestId(`${VALUE}-skeleton`)).toBeOnTheScreen();
    expect(screen.queryByTestId(VALUE)).not.toBeOnTheScreen();
  });

  it('shows Fees with an Orange chip and a strike-through for a full member waiver', () => {
    renderRow({
      fee: 2.5,
      originalFee: 3.5,
      feeDiscountPercentage: 100,
      feeSource: 'subscription',
      onInfoPress: jest.fn(),
    });

    expect(screen.getByText('Fees')).toBeOnTheScreen();
    expect(screen.getByTestId(CHIP)).toHaveTextContent('Orange');
    expect(screen.queryByText('Member fees')).not.toBeOnTheScreen();
    expect(screen.getByTestId(`${VALUE}-original`)).toHaveTextContent('$3.50');
    expect(screen.getByTestId(VALUE)).toHaveTextContent('$2.50');
    // The chip replaces the Member badge, and there is no sub-line.
    expect(screen.queryByTestId('rewards-member-badge')).not.toBeOnTheScreen();
    expect(screen.queryByText(/saving|waived/)).not.toBeOnTheScreen();
    expect(screen.getByTestId(ROW).props.accessibilityLabel).toBe(
      'Fees, Orange member, $2.50, was $3.50. About fees',
    );
  });

  it('shows the same Orange chip treatment for a partial member waiver', () => {
    // $2,413 order, $1,000 covered: the 0.1% MetaMask fee is waived on $1,000.
    renderRow({
      fee: 2.5,
      originalFee: 3.5,
      feeDiscountPercentage: 41.44,
      feeSource: 'subscription',
    });

    expect(screen.getByTestId(CHIP)).toBeOnTheScreen();
    expect(screen.getByTestId(`${VALUE}-original`)).toHaveTextContent('$3.50');
    expect(screen.getByTestId(VALUE)).toHaveTextContent('$2.50');
    expect(screen.getByTestId(ROW).props.accessibilityLabel).toBe(
      'Fees, Orange member, $2.50, was $3.50',
    );
  });

  it('drops the strike-through when both totals format the same', () => {
    renderRow({
      fee: 0.002,
      originalFee: 0.009,
      feeDiscountPercentage: 100,
      feeSource: 'subscription',
    });

    expect(screen.getByTestId(CHIP)).toBeOnTheScreen();
    expect(screen.getByTestId(VALUE)).toHaveTextContent('<$0.01');
    expect(screen.queryByTestId(`${VALUE}-original`)).not.toBeOnTheScreen();
    expect(screen.getByTestId(ROW).props.accessibilityLabel).toBe(
      'Fees, Orange member, <$0.01',
    );
  });

  it('keeps the strike-through for a tiny fee whose totals differ', () => {
    renderRow({
      fee: 0.004,
      originalFee: 0.0145,
      feeDiscountPercentage: 100,
      feeSource: 'subscription',
    });

    expect(screen.getByTestId(`${VALUE}-original`)).toHaveTextContent('$0.01');
    expect(screen.getByTestId(VALUE)).toHaveTextContent('<$0.01');
  });

  it('keeps the VIP badge and strike-through for a rewards discount', () => {
    renderRow({
      fee: 2.5,
      originalFee: 2.9,
      feeDiscountPercentage: 20,
      feeSource: 'rewards',
    });

    expect(screen.getByText('Fees')).toBeOnTheScreen();
    expect(screen.getByTestId('rewards-vip-badge')).toBeOnTheScreen();
    expect(screen.queryByTestId(CHIP)).not.toBeOnTheScreen();
    expect(screen.getByTestId(`${VALUE}-original`)).toBeOnTheScreen();
  });

  it('colours the Orange chip text with the Member badge orange', () => {
    renderRow({
      fee: 2.5,
      originalFee: 3.5,
      feeDiscountPercentage: 100,
      feeSource: 'subscription',
    });

    const chipLabel = screen
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.children === 'Orange');
    expect(chipLabel?.props.style).toEqual(
      expect.objectContaining({ color: colors.rewardsMemberLabel }),
    );
  });

  it('shows the Orange chip beside the compact info button in Pro', () => {
    const onInfoPress = jest.fn();
    renderRow({
      fee: 2.5,
      originalFee: 3.5,
      feeDiscountPercentage: 100,
      feeSource: 'subscription',
      size: 'compact',
      onInfoPress,
    });

    expect(screen.getByTestId(CHIP)).toHaveTextContent('Orange');
    fireEvent.press(screen.getByTestId(INFO));
    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });

  it('opens the fee breakdown from the row', () => {
    const onInfoPress = jest.fn();
    renderRow({ fee: 2.9, onInfoPress });

    fireEvent.press(screen.getByTestId(ROW));

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });

  it('draws the same small info icon as the Margin and Liquidation price rows', () => {
    renderRow({ fee: 2.9, onInfoPress: jest.fn() });

    const icon = screen
      .UNSAFE_getAllByType(Icon)
      .find((node) => node.props.testID === INFO);
    expect(icon?.props.name).toBe(IconName.Info);
    expect(icon?.props.size).toBe(IconSize.Sm);
    expect(icon?.props.color).toBe(IconColor.IconAlternative);
  });

  it('uses BodyMd labels and the small info icon in the medium size', () => {
    renderRow({ fee: 2.9, onInfoPress: jest.fn(), size: 'medium' });

    const label = screen
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.children === 'Fees');
    expect(label?.props.variant).toBe(TextVariant.BodyMd);
    const icon = screen
      .UNSAFE_getAllByType(Icon)
      .find((node) => node.props.testID === INFO);
    expect(icon?.props.size).toBe(IconSize.Sm);
  });

  it('opens the fee breakdown from the compact info button', () => {
    const onInfoPress = jest.fn();
    renderRow({ fee: 2.9, onInfoPress, size: 'compact' });

    fireEvent.press(screen.getByTestId(INFO));

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });

  it('disables the compact info button when there is no breakdown to open', () => {
    renderRow({ fee: 2.9, size: 'compact' });

    expect(screen.getByTestId(INFO)).toBeDisabled();
  });
});
