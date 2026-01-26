import React from 'react';
import { render } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as reactRedux from 'react-redux';
import MarketDetailsList from '.';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

const mockMarketDetails = {
  allTimeHigh: '€1.11',
  allTimeLow: '€0.80',
  circulatingSupply: '5.24B',
  fullyDiluted: '2.03M',
  marketCap: '4.76B',
  totalVolume: '153.14M',
  volumeToMarketCap: '3.22%',
};

describe('MarketDetailsList', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });
  it('should render correctly', () => {
    const useDispatchSpy = jest.spyOn(reactRedux, 'useDispatch');
    useDispatchSpy.mockImplementation(() => jest.fn());
    const { getByText } = render(
      <MarketDetailsList marketDetails={mockMarketDetails} />,
    );

    expect(getByText('Market details')).toBeDefined();
    expect(getByText('Market cap')).toBeDefined();
    expect(getByText('5.24B')).toBeDefined();
    expect(getByText('Total volume (24h)')).toBeDefined();
    expect(getByText('153.14M')).toBeDefined();
    expect(getByText('Volume / market cap')).toBeDefined();
    expect(getByText('3.22%')).toBeDefined();
    expect(getByText('Circulating supply')).toBeDefined();
    expect(getByText('5.24B')).toBeDefined();
    expect(getByText('All time high')).toBeDefined();
    expect(getByText('€1.11')).toBeDefined();
    expect(getByText('All time low')).toBeDefined();
    expect(getByText('€0.80')).toBeDefined();
    expect(getByText('Fully diluted')).toBeDefined();
    expect(getByText('2.03M')).toBeDefined();
  });
});
