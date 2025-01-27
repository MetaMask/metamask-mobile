import React from 'react';
import UpsellBanner from '.';
import {
  UPSELL_BANNER_VARIANTS,
  UpsellBannerProps,
} from './UpsellBanner.types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

describe('UpsellBanner', () => {
  const baseProps = {
    primaryText: 'you could earn',
    secondaryText: '$454',
    tertiaryText: 'per year on your tokens',
    endAccessory: (
      <Button
        label={'Earn 4.5%'}
        variant={ButtonVariants.Secondary}
        onPress={jest.fn()}
      />
    ),
  };

  describe('UpsellBannerHeader variant', () => {
    it('render matches screenshot', () => {
      const props: UpsellBannerProps = {
        variant: UPSELL_BANNER_VARIANTS.HEADER,
        ...baseProps,
      };

      const { toJSON } = renderWithProvider(<UpsellBanner {...props} />);

      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('UpsellBannerBody variant', () => {
    it('render matches screenshot', () => {
      const props: UpsellBannerProps = {
        variant: UPSELL_BANNER_VARIANTS.BODY,
        onTooltipPress: jest.fn(),
        ...baseProps,
      };

      const { toJSON } = renderWithProvider(<UpsellBanner {...props} />);

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
