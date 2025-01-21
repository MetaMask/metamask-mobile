import React from 'react';
import UpsellBanner from '.';
import {
  UPSELL_BANNER_VARIANTS,
  UpsellBannerProps,
} from './UpsellBanner.types';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

describe('UpsellBanner', () => {
  const baseProps = {
    primaryText: 'you could earn',
    secondaryText: '$454',
    tertiaryText: 'per year on your tokens',
  };

  describe('UpsellBannerReadOnly', () => {
    it('render matches screenshot', () => {
      const props: UpsellBannerProps = {
        variant: UPSELL_BANNER_VARIANTS.READ_ONLY,
        ...baseProps,
      };

      const { toJSON } = renderWithProvider(<UpsellBanner {...props} />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('UpsellBannerInteractive', () => {
    it('render matches screenshot', () => {
      const props: UpsellBannerProps = {
        variant: UPSELL_BANNER_VARIANTS.INTERACTIVE,
        onButtonPress: jest.fn(),
        onTooltipPress: jest.fn(),
        buttonLabel: `${strings('stake.earn')} 4.5%`,
        ...baseProps,
      };

      const { toJSON } = renderWithProvider(<UpsellBanner {...props} />);

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
