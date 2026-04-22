import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsOICapWarning from './PerpsOICapWarning';
import { usePerpsOICap } from '../../hooks/usePerpsOICap';
import { strings } from '../../../../../../locales/i18n';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

jest.mock('../../hooks/usePerpsOICap');

describe('PerpsOICapWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when not at cap', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: false,
        isLoading: false,
      });

      const { queryByTestId } = render(
        <PerpsOICapWarning symbol="BTC" variant="inline" />,
      );

      expect(queryByTestId('perps-oi-cap-warning')).toBeNull();
    });

    it('should not render when loading', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: false,
        isLoading: true,
      });

      const { queryByTestId } = render(
        <PerpsOICapWarning symbol="BTC" variant="inline" />,
      );

      expect(queryByTestId('perps-oi-cap-warning')).toBeNull();
    });

    it('should render when at cap', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: true,
        isLoading: false,
      });

      const { getByTestId, getByText } = render(
        <PerpsOICapWarning symbol="BTC" variant="inline" />,
      );

      expect(getByTestId('perps-oi-cap-warning')).toBeTruthy();
      expect(
        getByText(strings('perps.order.validation.oi_cap_reached')),
      ).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: true,
        isLoading: false,
      });

      const { getByTestId } = render(
        <PerpsOICapWarning
          symbol="BTC"
          variant="inline"
          testID="custom-test-id"
        />,
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });

  describe('variants', () => {
    beforeEach(() => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: true,
        isLoading: false,
      });
    });

    it('should render inline variant by default', () => {
      const { UNSAFE_getByProps } = render(<PerpsOICapWarning symbol="BTC" />);

      // Inline variant uses BodySM text
      expect(
        UNSAFE_getByProps({ variant: TextVariant.BodySM }).props.variant,
      ).toBe(TextVariant.BodySM);
    });

    it('should render banner variant when specified', () => {
      const { UNSAFE_getByProps } = render(
        <PerpsOICapWarning symbol="BTC" variant="banner" />,
      );

      // Banner variant uses BodyMD text (larger text for banner prominence)
      expect(
        UNSAFE_getByProps({ variant: TextVariant.BodyMD }).props.variant,
      ).toBe(TextVariant.BodyMD);
    });

    it('should render inline variant when specified', () => {
      const { UNSAFE_getByProps } = render(
        <PerpsOICapWarning symbol="BTC" variant="inline" />,
      );

      // Inline variant uses BodySM text
      expect(
        UNSAFE_getByProps({ variant: TextVariant.BodySM }).props.variant,
      ).toBe(TextVariant.BodySM);
    });
  });

  describe('symbol handling', () => {
    it('should work with standard symbols', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: true,
        isLoading: false,
      });

      const { getByTestId } = render(<PerpsOICapWarning symbol="BTC" />);

      expect(getByTestId('perps-oi-cap-warning')).toBeTruthy();
      expect(usePerpsOICap).toHaveBeenCalledWith('BTC');
    });

    it('should work with HIP-3 symbols', () => {
      (usePerpsOICap as jest.Mock).mockReturnValue({
        isAtCap: true,
        isLoading: false,
      });

      const { getByTestId } = render(<PerpsOICapWarning symbol="xyz:TSLA" />);

      expect(getByTestId('perps-oi-cap-warning')).toBeTruthy();
      expect(usePerpsOICap).toHaveBeenCalledWith('xyz:TSLA');
    });
  });
});
