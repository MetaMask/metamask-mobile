import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceImpactDescription } from './PriceImpactDescription';
import { strings } from '../../../../../../locales/i18n';

describe('PriceImpactDescription', () => {
  describe('content rendering', () => {
    it('renders the localized content string with the given formattedPriceImpact', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_error_description"
          formattedPriceImpact="-30%"
          isDanger={false}
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_error_description', {
            priceImpact: '-30%',
          }),
        ),
      ).toBeTruthy();
    });

    it('renders the warning description with the given formattedPriceImpact', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_warning_description"
          formattedPriceImpact="-10%"
          isDanger={false}
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_warning_description', {
            priceImpact: '-10%',
          }),
        ),
      ).toBeTruthy();
    });

    it('renders the info description (no interpolation needed)', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_info_description"
          formattedPriceImpact={undefined}
          isDanger={false}
        />,
      );

      expect(
        getByText(strings('bridge.price_impact_info_description')),
      ).toBeTruthy();
    });
  });

  describe('formattedPriceImpact fallback', () => {
    it('falls back to "0" when formattedPriceImpact is undefined', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_error_description"
          formattedPriceImpact={undefined}
          isDanger={false}
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_error_description', {
            priceImpact: '0',
          }),
        ),
      ).toBeTruthy();
    });

    it('uses the provided value and does not fall back when formattedPriceImpact is "0"', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_warning_description"
          formattedPriceImpact="0"
          isDanger={false}
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_warning_description', {
            priceImpact: '0',
          }),
        ),
      ).toBeTruthy();
    });
  });

  describe('fiat loss banner', () => {
    it('shows the banner text when isDanger=true and formattedPriceImpactFiat is provided', () => {
      const { getByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_error_description"
          formattedPriceImpact="96.40%"
          formattedPriceImpactFiat="$7.05"
          isDanger
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_fiat_alert', {
            priceImpactFiat: '$7.05',
          }),
        ),
      ).toBeTruthy();
    });

    it('does not show the banner text when isDanger=false even with formattedPriceImpactFiat', () => {
      const { queryByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_warning_description"
          formattedPriceImpact="10%"
          formattedPriceImpactFiat="$1.00"
          isDanger={false}
        />,
      );

      expect(
        queryByText(
          strings('bridge.price_impact_fiat_alert', {
            priceImpactFiat: '$1.00',
          }),
        ),
      ).toBeNull();
    });

    it('does not show the banner text when isDanger=true but formattedPriceImpactFiat is undefined', () => {
      const { queryByText } = render(
        <PriceImpactDescription
          content="bridge.price_impact_error_description"
          formattedPriceImpact="96.40%"
          formattedPriceImpactFiat={undefined}
          isDanger
        />,
      );

      expect(
        queryByText(
          strings('bridge.price_impact_fiat_alert', {
            priceImpactFiat: undefined,
          }),
        ),
      ).toBeNull();
    });
  });
});
