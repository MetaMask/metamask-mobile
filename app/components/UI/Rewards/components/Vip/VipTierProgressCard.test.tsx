import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import VipTierProgressCard, {
  VIP_TIER_PROGRESS_CARD_TEST_IDS,
} from './VipTierProgressCard';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

describe('VipTierProgressCard', () => {
  const baseProps = {
    currentTier: { id: 't3', name: 'Gold Fox VIP 3', tier: 3 },
    progress: {
      percent: 72,
      remainingSwapsUsd: 800_000,
      remainingPerpsUsd: 3_600_000,
      estimatedDaysToNextTier: 4,
      status: 'on_track',
    },
    subline: '$800K Swaps • $3.6M Perps to Gold Fox VIP 4',
  };

  it('renders the current tier name and the subline passed in by the parent', () => {
    const { getByText, getByTestId } = render(
      <VipTierProgressCard {...baseProps} />,
    );

    expect(getByText('Gold Fox VIP 3')).toBeOnTheScreen();
    expect(
      getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.SUBLINE),
    ).toHaveTextContent('$800K Swaps • $3.6M Perps to Gold Fox VIP 4');
  });

  it('clamps progress fill width to the 0-100 range', () => {
    const flattenWidth = (style: unknown): string | undefined => {
      const styles = Array.isArray(style) ? style : [style];
      for (const entry of styles.reverse()) {
        if (
          entry &&
          typeof entry === 'object' &&
          'width' in (entry as Record<string, unknown>)
        ) {
          return (entry as { width: string }).width;
        }
      }
      return undefined;
    };

    const { getByTestId, rerender } = render(
      <VipTierProgressCard
        {...baseProps}
        progress={{ ...baseProps.progress, percent: 150 }}
      />,
    );
    expect(
      flattenWidth(
        getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL).props.style,
      ),
    ).toBe('100%');

    rerender(
      <VipTierProgressCard
        {...baseProps}
        progress={{ ...baseProps.progress, percent: -10 }}
      />,
    );
    expect(
      flattenWidth(
        getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.PROGRESS_FILL).props.style,
      ),
    ).toBe('0%');
  });

  it('invokes onPress when the card is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <VipTierProgressCard {...baseProps} onPress={onPress} />,
    );
    fireEvent.press(getByTestId(VIP_TIER_PROGRESS_CARD_TEST_IDS.CONTAINER));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
