import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, TextColor } from '@metamask/design-system-react-native';
import Svg from 'react-native-svg';
import { PerpsFeeDiscountLabelSelectorsIDs } from '../../Perps.testIds';
import PerpsFeeCaption from './PerpsFeeCaption';
import { SEAL_PERCENT_ICON_SIZE } from './SealPercentIcon';

const CAPTION_TEST_ID = 'perps-fee-caption';

const ENGLISH_PROMO_TEMPLATES: Record<string, string> = {
  'perps.trade_sheet.includes_fee_after_promo':
    'Includes {{originalFeePercentage}}% {{feePercentage}}% fee after promo',
  'perps.trade_sheet.includes_fee_after_promo_with_bridge':
    'Includes {{originalFeePercentage}}% {{feePercentage}}% fee after promo + {{bridgeFee}} bridge fee',
  'perps.trade_sheet.includes_fee_after_promo_discounted':
    'Includes {{feePercentage}}% fee after promo',
  'perps.trade_sheet.includes_fee_after_promo_discounted_with_bridge':
    'Includes {{feePercentage}}% fee after promo + {{bridgeFee}} bridge fee',
  'perps.trade_sheet.includes_fee_after_promo_a11y':
    'Includes {{feePercentage}}% fee after promo, was {{originalFeePercentage}}%',
  'perps.trade_sheet.includes_fee_after_promo_a11y_with_bridge':
    'Includes {{feePercentage}}% fee after promo, was {{originalFeePercentage}}%, plus {{bridgeFee}} bridge fee',
};

const interpolate = (
  template: string,
  params: Record<string, string | undefined> = {},
) =>
  template.replace(/\{\{(.*?)\}\}/g, (_, name: string) => params[name] ?? '');

const mockStrings = jest.fn(
  (key: string, params?: Record<string, string | undefined>) =>
    interpolate(ENGLISH_PROMO_TEMPLATES[key] ?? key, params),
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | undefined>) =>
    mockStrings(key, params),
}));

describe('PerpsFeeCaption', () => {
  beforeEach(() => {
    mockStrings.mockImplementation(
      (key: string, params?: Record<string, string | undefined>) =>
        interpolate(ENGLISH_PROMO_TEMPLATES[key] ?? key, params),
    );
  });

  it('strikes the original rate inside one translated promo sentence', () => {
    render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        originalFeePercentage="0.143"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    expect(screen.getByTestId(CAPTION_TEST_ID)).toHaveTextContent(
      'Includes 0.143% 0.063% fee after promo',
    );
    expect(screen.getByText('0.143')).toHaveStyle({
      textDecorationLine: 'line-through',
    });
    expect(screen.getByText('0.063%')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Includes 0.063% fee after promo, was 0.143%'),
    ).toBeOnTheScreen();
  });

  it('uses success color for the discounted promotional rate', () => {
    render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        originalFeePercentage="0.143"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    const discountedRate = screen
      .UNSAFE_getAllByType(Text)
      .find((node) => node.props.children === '0.063%');

    expect(discountedRate?.props.color).toBe(TextColor.SuccessDefault);
  });

  it('uses the caption-sized promotional seal', () => {
    const { UNSAFE_getByType } = render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        originalFeePercentage="0.143"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    expect(
      screen.getByTestId(PerpsFeeDiscountLabelSelectorsIDs.LABEL),
    ).toBeOnTheScreen();
    expect(UNSAFE_getByType(Svg).props).toMatchObject({
      width: SEAL_PERCENT_ICON_SIZE.caption,
      height: SEAL_PERCENT_ICON_SIZE.caption,
    });
  });

  it('places a translated prefix percent sign with the styled discounted rate', () => {
    mockStrings.mockImplementation(
      (key: string, params?: Record<string, string | undefined>) => {
        if (key === 'perps.trade_sheet.includes_fee_after_promo') {
          return interpolate(
            '%{{originalFeePercentage}} %{{feePercentage}} ücret dahildir',
            params,
          );
        }
        return interpolate(ENGLISH_PROMO_TEMPLATES[key] ?? key, params);
      },
    );

    render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        originalFeePercentage="0.143"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    expect(screen.getByTestId(CAPTION_TEST_ID)).toHaveTextContent(
      '%0.143 %0.063 ücret dahildir',
    );
    expect(screen.getByText('0.143')).toHaveStyle({
      textDecorationLine: 'line-through',
    });
    expect(screen.getByText('0.143').props.children).toBe('0.143');
    expect(screen.getByText('%0.063').props.children).toBe('%0.063');
  });

  it('uses the discounted-only sentence when the original rate is absent', () => {
    render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    expect(screen.getByTestId(CAPTION_TEST_ID)).toHaveTextContent(
      'Includes 0.063% fee after promo',
    );
    expect(screen.queryByText('0.063%')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/was/)).not.toBeOnTheScreen();
  });

  it('keeps the bridge fee in the discounted-only sentence', () => {
    render(
      <PerpsFeeCaption
        testID={CAPTION_TEST_ID}
        feePercentage="0.063"
        bridgeFee="$0.15"
        feeDiscountPercentage={80}
        feeDiscountKind="promotional"
      />,
    );

    expect(screen.getByTestId(CAPTION_TEST_ID)).toHaveTextContent(
      'Includes 0.063% fee after promo + $0.15 bridge fee',
    );
    expect(screen.queryByLabelText(/was/)).not.toBeOnTheScreen();
  });
});
