import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { strings } from '../../../../../../locales/i18n';
import { BatchSellPriceImpactInfoModal } from './index';
import { BatchSellPriceImpactInfoModalSelectorsIDs } from './BatchSellPriceImpactInfoModal.testIds';
import { BatchSellPriceImpactInfoModalParams } from './BatchSellPriceImpactInfoModal.types';

const mockGoBack = jest.fn();
let mockRouteParams: BatchSellPriceImpactInfoModalParams;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockRouteParams,
}));

function renderModal(
  params: BatchSellPriceImpactInfoModalParams = { priceImpact: '0.06' },
) {
  mockRouteParams = params;

  return render(<BatchSellPriceImpactInfoModal />);
}

describe('BatchSellPriceImpactInfoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { priceImpact: '0.06' };
  });

  it('renders the high price impact information', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(BatchSellPriceImpactInfoModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.batch_sell_high_price_impact')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellPriceImpactInfoModalSelectorsIDs.DESCRIPTION),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('bridge.batch_sell_high_price_impact_description', {
          priceImpact: '6.00%',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('closes with navigation when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellPriceImpactInfoModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
