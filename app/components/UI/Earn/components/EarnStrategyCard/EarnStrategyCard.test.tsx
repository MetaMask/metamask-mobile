import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import EarnStrategyCard from './EarnStrategyCard';
import { EarnStrategyRiskLevel } from './EarnStrategyCard.types';

const createCardProps = (
  overrides: Partial<React.ComponentProps<typeof EarnStrategyCard>> = {},
): React.ComponentProps<typeof EarnStrategyCard> => ({
  risk: EarnStrategyRiskLevel.Recommended,
  title: 'Stable earnings',
  subtitle: 'Earn with a conservative strategy',
  tertiaryText: '3.5% APR',
  ...overrides,
});

describe('EarnStrategyCard', () => {
  it('renders strategy content and recommended risk tag', () => {
    const props = createCardProps({ testID: 'strategy-card' });

    const { getByTestId, getByText } = render(<EarnStrategyCard {...props} />);

    expect(getByTestId('strategy-card')).toBeOnTheScreen();
    expect(getByText('Recommended')).toBeOnTheScreen();
    expect(getByText(props.title)).toBeOnTheScreen();
    expect(getByText(props.subtitle)).toBeOnTheScreen();
    expect(getByText(props.tertiaryText)).toBeOnTheScreen();
  });

  it.each([
    [EarnStrategyRiskLevel.Recommended, 'Recommended'],
    [EarnStrategyRiskLevel.Low, 'Low risk'],
    [EarnStrategyRiskLevel.Medium, 'Medium risk'],
    [EarnStrategyRiskLevel.High, 'High risk'],
  ] as const)('renders the %s risk label', (risk, label) => {
    const props = createCardProps({ risk });

    const { getByText } = render(<EarnStrategyCard {...props} />);

    expect(getByText(label)).toBeOnTheScreen();
  });

  it('renders the no-fee tag when fees are subsidized', () => {
    const { getByTestId } = render(
      <EarnStrategyCard
        {...createCardProps({
          isFeeSubsidized: true,
          testID: 'strategy-card',
        })}
      />,
    );

    expect(getByTestId('strategy-card-no-fee-tag')).toBeOnTheScreen();
  });

  it('omits the no-fee tag when fees are not subsidized', () => {
    const { queryByTestId } = render(
      <EarnStrategyCard
        {...createCardProps({
          isFeeSubsidized: false,
          testID: 'strategy-card',
        })}
      />,
    );

    expect(queryByTestId('strategy-card-no-fee-tag')).not.toBeOnTheScreen();
  });

  it('exposes selected button state and invokes onPress', () => {
    const onPress = jest.fn();

    const { getByTestId } = render(
      <EarnStrategyCard
        {...createCardProps({
          onPress,
          selected: true,
          testID: 'strategy-card',
        })}
      />,
    );
    const card = getByTestId('strategy-card');

    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
