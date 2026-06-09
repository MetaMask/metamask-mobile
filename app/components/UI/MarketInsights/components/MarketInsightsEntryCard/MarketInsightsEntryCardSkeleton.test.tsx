import React from 'react';
import { render } from '@testing-library/react-native';
import MarketInsightsEntryCardSkeleton from './MarketInsightsEntryCardSkeleton';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

describe('MarketInsightsEntryCardSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<MarketInsightsEntryCardSkeleton />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders with the correct testID', () => {
    const { getByTestId } = render(<MarketInsightsEntryCardSkeleton />);
    expect(
      getByTestId(MarketInsightsSelectorsIDs.ENTRY_CARD_SKELETON),
    ).toBeOnTheScreen();
  });
});
