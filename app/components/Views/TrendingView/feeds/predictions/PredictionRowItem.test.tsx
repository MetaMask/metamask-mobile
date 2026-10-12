import React from 'react';
import { render } from '@testing-library/react-native';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import {
  PredictionCarouselRowItem,
  PredictionSearchRowItem,
} from './PredictionRowItem';

jest.mock('../../../../UI/Predict/components/PredictMarketRowItem', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ entryPoint }: { entryPoint?: string }) => (
    <Text testID="stub-predict-market-row" accessibilityLabel={entryPoint} />
  );
});

jest.mock('../../../../UI/Predict/components/PredictMarket', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ entryPoint }: { entryPoint?: string }) => (
    <Text testID="stub-predict-market-card" accessibilityLabel={entryPoint} />
  );
});

const market = { id: 'market-1' } as PredictMarketType;

describe('PredictionSearchRowItem', () => {
  it('passes the explore_search entry point', () => {
    const { getByTestId } = render(<PredictionSearchRowItem market={market} />);

    expect(
      getByTestId('stub-predict-market-row').props.accessibilityLabel,
    ).toBe(PredictEventValues.ENTRY_POINT.EXPLORE_SEARCH);
  });
});

describe('PredictionCarouselRowItem', () => {
  it('keeps the explore entry point', () => {
    const { getByTestId } = render(
      <PredictionCarouselRowItem market={market} />,
    );

    expect(
      getByTestId('stub-predict-market-card').props.accessibilityLabel,
    ).toBe(PredictEventValues.ENTRY_POINT.EXPLORE);
  });
});
