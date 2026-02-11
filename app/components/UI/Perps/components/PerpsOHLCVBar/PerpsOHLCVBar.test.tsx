import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsOHLCVBar from './PerpsOHLCVBar';
import {
  formatPerpsFiat,
  formatVolume,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { PerpsOHLCVBarSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      valuesRow: {},
      labelsRow: {},
      valueText: {},
      labelText: {},
      column: {},
    },
  }),
}));

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn(),
  formatVolume: jest.fn(),
  PRICE_RANGES_UNIVERSAL: [],
}));

describe('PerpsOHLCVBar', () => {
  const mockFormatPerpsFiat = formatPerpsFiat as jest.MockedFunction<
    typeof formatPerpsFiat
  >;
  const mockFormatVolume = formatVolume as jest.MockedFunction<
    typeof formatVolume
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatPerpsFiat.mockReturnValue('$1000.00');
    mockFormatVolume.mockReturnValue('1.2M');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="1000.00"
          high="1100.00"
          low="900.00"
          close="1050.00"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
    });

    it('renders with volume data', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="1000.00"
          high="1100.00"
          low="900.00"
          close="1050.00"
          volume="1234567.89"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
    });

    it('renders without volume data', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="1000.00"
          high="1100.00"
          low="900.00"
          close="1050.00"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
    });
  });

  describe('Formatting', () => {
    it('calls formatPerpsFiat for each OHLC value with correct arguments', () => {
      render(
        <PerpsOHLCVBar
          open="27750.00"
          high="27890.00"
          low="27680.00"
          close="27820.00"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(4);
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith('27750.00', {
        ranges: PRICE_RANGES_UNIVERSAL,
        stripTrailingZeros: true,
      });
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith('27890.00', {
        ranges: PRICE_RANGES_UNIVERSAL,
        stripTrailingZeros: true,
      });
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith('27680.00', {
        ranges: PRICE_RANGES_UNIVERSAL,
        stripTrailingZeros: true,
      });
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith('27820.00', {
        ranges: PRICE_RANGES_UNIVERSAL,
        stripTrailingZeros: true,
      });
    });

    it('calls formatVolume when volume is provided', () => {
      render(
        <PerpsOHLCVBar
          open="1000.00"
          high="1100.00"
          low="900.00"
          close="1050.00"
          volume="1234567.89"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(mockFormatVolume).toHaveBeenCalledWith('1234567.89');
    });

    it('does not call formatVolume when volume is not provided', () => {
      render(
        <PerpsOHLCVBar
          open="1000.00"
          high="1100.00"
          low="900.00"
          close="1050.00"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(mockFormatVolume).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="0"
          high="0"
          low="0"
          close="0"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(4);
    });

    it('handles very large numbers', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="999999.99"
          high="999999.99"
          low="999999.99"
          close="999999.99"
          volume="999999999999"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
      expect(mockFormatPerpsFiat).toHaveBeenCalledTimes(4);
      expect(mockFormatVolume).toHaveBeenCalledWith('999999999999');
    });

    it('handles high decimal precision', () => {
      const { getByTestId } = render(
        <PerpsOHLCVBar
          open="0.0012345"
          high="0.0012346"
          low="0.0012344"
          close="0.0012345"
          testID={PerpsOHLCVBarSelectorsIDs.CONTAINER}
        />,
      );

      expect(getByTestId(PerpsOHLCVBarSelectorsIDs.CONTAINER)).toBeDefined();
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith(
        '0.0012345',
        expect.any(Object),
      );
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith(
        '0.0012346',
        expect.any(Object),
      );
      expect(mockFormatPerpsFiat).toHaveBeenCalledWith(
        '0.0012344',
        expect.any(Object),
      );
    });
  });
});
