import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { PredictMarketStatus } from '../../../../types';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import PredictMarketDetailsActions from './PredictMarketDetailsActions';

describe('PredictMarketDetailsActions', () => {
  it('disables the claim button when claim is pending', () => {
    renderWithProvider(
      <PredictMarketDetailsActions
        isClaimablePositionsLoading={false}
        hasPositivePnl
        marketStatus={PredictMarketStatus.OPEN}
        singleOutcomeMarket={false}
        isMarketFetching={false}
        market={null}
        openOutcomes={[]}
        yesPercentage={50}
        isClaimDisabled
        onClaimPress={jest.fn()}
        onBuyPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
      ),
    ).toBeDisabled();
  });
});
