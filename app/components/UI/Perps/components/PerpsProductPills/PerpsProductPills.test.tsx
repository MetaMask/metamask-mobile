import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsProductPills from './PerpsProductPills';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockNavigateToMarketList = jest.fn();
const mockTrack = jest.fn();

jest.mock('../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketList: mockNavigateToMarketList,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

describe('PerpsProductPills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all product pills', () => {
    const { getByTestId } = renderWithProvider(<PerpsProductPills />);

    expect(getByTestId('perps-product-pills')).toBeDefined();
    expect(getByTestId('perps-product-pills-crypto')).toBeDefined();
    expect(getByTestId('perps-product-pills-stocks')).toBeDefined();
    expect(getByTestId('perps-product-pills-commodities')).toBeDefined();
    expect(getByTestId('perps-product-pills-forex')).toBeDefined();
  });

  it('navigates to market list with correct filter on pill press', () => {
    const { getByTestId } = renderWithProvider(<PerpsProductPills />);

    fireEvent.press(getByTestId('perps-product-pills-crypto'));

    expect(mockNavigateToMarketList).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMarketTypeFilter: 'crypto',
        source: 'perps_home__product_pill',
        fromHome: true,
      }),
    );
  });

  it('tracks analytics event on pill press with source', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProductPills source="perps_home" />,
    );

    fireEvent.press(getByTestId('perps-product-pills-stocks'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        product: 'stocks',
        pill_position: 1,
        source: 'perps_home',
      }),
    );
  });

  it('passes transactionActiveAbTests to navigation', () => {
    const abTests = [{ testId: 'test-1', variantId: 'variant-a' }];
    const { getByTestId } = renderWithProvider(
      <PerpsProductPills transactionActiveAbTests={abTests as never} />,
    );

    fireEvent.press(getByTestId('perps-product-pills-forex'));

    expect(mockNavigateToMarketList).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMarketTypeFilter: 'forex',
        transactionActiveAbTests: abTests,
      }),
    );
  });

  it('tracks correct pill_position for each pill', () => {
    const { getByTestId } = renderWithProvider(<PerpsProductPills />);

    fireEvent.press(getByTestId('perps-product-pills-commodities'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        product: 'commodities',
        pill_position: 2,
      }),
    );
  });
});
