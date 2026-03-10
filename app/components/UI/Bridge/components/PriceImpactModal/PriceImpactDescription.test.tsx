import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceImpactDescription } from './PriceImpactDescription';
import { PriceImpactModalType } from './constants';
import { strings } from '../../../../../../locales/i18n';

describe('PriceImpactDescription', () => {
  describe('Execution type', () => {
    it('renders the execution description with the given priceImpact', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Execution}
          formattedPriceImpact="-30%"
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_execution_description', {
            priceImpact: '-30%',
          }),
        ),
      ).toBeTruthy();
    });

    it('renders the execution description with "0" when priceImpact is undefined', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Execution}
          formattedPriceImpact={undefined}
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_execution_description', {
            priceImpact: '0',
          }),
        ),
      ).toBeTruthy();
    });

    it('does not render the info description', () => {
      const { queryByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Execution}
          formattedPriceImpact="-30%"
        />,
      );

      expect(
        queryByText(strings('bridge.price_impact_info_description')),
      ).toBeNull();
    });
  });

  describe('Info type — with priceImpact (warning state)', () => {
    it('renders the warning description with the given priceImpact', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact="-10%"
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

    it('does not render the info description when priceImpact is provided', () => {
      const { queryByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact="-10%"
        />,
      );

      expect(
        queryByText(strings('bridge.price_impact_info_description')),
      ).toBeNull();
    });

    it('treats the string "0" as a truthy priceImpact and renders the warning description', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact="0"
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

  describe('Info type — without priceImpact (info state)', () => {
    it('renders the info description when priceImpact is undefined', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact={undefined}
        />,
      );

      expect(
        getByText(strings('bridge.price_impact_info_description')),
      ).toBeTruthy();
    });

    it('renders the info description when priceImpact is an empty string', () => {
      const { getByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact=""
        />,
      );

      expect(
        getByText(strings('bridge.price_impact_info_description')),
      ).toBeTruthy();
    });

    it('does not render the warning description when priceImpact is absent', () => {
      const { queryByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Info}
          formattedPriceImpact={undefined}
        />,
      );

      expect(
        queryByText(
          strings('bridge.price_impact_warning_description', {
            priceImpact: undefined,
          }),
        ),
      ).toBeNull();
    });
  });

  describe('priority — Execution type takes precedence over warning state', () => {
    it('renders the execution description rather than the warning description when type is Execution and priceImpact is provided', () => {
      const { getByText, queryByText } = render(
        <PriceImpactDescription
          type={PriceImpactModalType.Execution}
          formattedPriceImpact="-10%"
        />,
      );

      expect(
        getByText(
          strings('bridge.price_impact_execution_description', {
            priceImpact: '-10%',
          }),
        ),
      ).toBeTruthy();

      expect(
        queryByText(
          strings('bridge.price_impact_warning_description', {
            priceImpact: '-10%',
          }),
        ),
      ).toBeNull();
    });
  });
});
