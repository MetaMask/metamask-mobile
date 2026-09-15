import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PerpsTradeScreen from './PerpsTradeScreen';

jest.mock('./PerpsTradeBottomSheet', () => ({
  PerpsTradeSheetTitleBanner: () => null,
  usePerpsTradeSheet: () => ({
    navigateTo: jest.fn(),
    title: undefined,
    banner: undefined,
  }),
}));

jest.mock('../PerpsSlider', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../PerpsOICapWarning', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../PerpsServiceInterruptionBanner', () => ({
  __esModule: true,
  default: () => null,
}));

const defaultProps: React.ComponentProps<typeof PerpsTradeScreen> = {
  asset: 'SOL',
  direction: 'long',
  leverage: 3,
  amount: '10',
  tokenAmount: '0.11',
  sliderMaximum: 100,
  isAmountDisabled: false,
  isAmountLoading: false,
  hasAmountError: false,
  isInputFocused: false,
  liquidationPrice: '$68.292',
  liquidationPercentage: '30.05%',
  payWithName: 'Perps balance',
  payWithBalance: '$1,285.82',
  feePercentage: '0.143',
  isSubmitting: false,
  isSubmitDisabled: false,
  errorMessages: [],
  isAtOICap: false,
  showServiceInterruptionBanner: false,
  onAmountPress: jest.fn(),
  onSliderValueChange: jest.fn(),
  onSliderDragEnd: jest.fn(),
  onKeypadChange: jest.fn(),
  onPercentagePress: jest.fn(),
  onMaxPress: jest.fn(),
  onDonePress: jest.fn(),
  onSubmit: jest.fn(),
};

describe('PerpsTradeScreen errors', () => {
  it('propagates every form error to an accessible alert', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        hasAmountError
        isSubmitDisabled
        errorMessages={[
          { key: 'minimum', message: 'Minimum order is $10' },
          { key: 'quote', message: 'No payment quote available' },
        ]}
      />,
    );

    expect(
      screen.getByRole('alert', { name: 'Minimum order is $10' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('alert', { name: 'No payment quote available' }),
    ).toBeOnTheScreen();
  });

  it('propagates an order execution error to the footer', () => {
    render(
      <PerpsTradeScreen
        {...defaultProps}
        errorMessages={[
          { key: 'execution', message: 'Order could not be submitted' },
        ]}
      />,
    );

    expect(screen.getByText('Order could not be submitted')).toBeOnTheScreen();
  });
});
