import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import PerpsTradeScreen from './PerpsTradeScreen';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';

const mockNavigateTo = jest.fn();
const mockClose = jest.fn();

jest.mock('./PerpsTradeBottomSheet', () => ({
  PerpsTradeSheetTitleBanner: () => null,
  usePerpsTradeSheet: () => ({
    navigateTo: mockNavigateTo,
    close: mockClose,
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
  oiCapSymbol: 'SOL',
  direction: 'long',
  leverage: 3,
  amount: '10',
  tokenAmount: '0.11',
  sliderMaximum: 100,
  isAmountDisabled: false,
  isAmountLoading: false,
  hasAmountError: false,
  showAmountWarning: false,
  isInputFocused: false,
  liquidationPrice: '$68.292',
  liquidationPercentage: '30.05%',
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('wires primary Trade actions to the sheet and order handlers', () => {
    const onSubmit = jest.fn();
    render(<PerpsTradeScreen {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.SETTINGS_BUTTON),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('settings');

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LEVERAGE_ROW),
    );
    expect(mockNavigateTo).toHaveBeenCalledWith('leverage');

    expect(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.LIQUIDATION_ROW),
    ).toBeOnTheScreen();
    expect(mockNavigateTo).not.toHaveBeenCalledWith('orderSummary');

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);

    fireEvent.press(
      screen.getByTestId(PerpsTradeSheetSelectorsIDs.CLOSE_BUTTON),
    );
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('hides the order CTA while the market is at its OI cap', () => {
    render(<PerpsTradeScreen {...defaultProps} isAtOICap />);

    expect(
      screen.queryByTestId(PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it.each([
    ['long', IconName.TrendDown],
    ['short', IconName.TrendUp],
  ] as const)(
    'uses the correct liquidation trend for a %s trade',
    (direction, iconName) => {
      render(<PerpsTradeScreen {...defaultProps} direction={direction} />);

      expect(screen.UNSAFE_getByProps({ name: iconName })).toBeDefined();
    },
  );

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
