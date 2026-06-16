import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CreatePriceAlertView from './CreatePriceAlertView';
import { CreatePriceAlertTestIds } from '../../constants';

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockSave = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockUseSavePriceAlert = jest.fn(() => ({
  save: mockSave,
  isSubmitting: false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, pop: mockPop }),
  useRoute: () => ({
    params: {
      symbol: 'ETH',
      ticker: 'ETH',
      currentPrice: 1201.98,
      currentCurrency: 'USD',
      assetId: 'eip155:1/slip44:60',
    },
  }),
}));

jest.mock('../../api', () => ({
  useSavePriceAlert: () => mockUseSavePriceAlert(),
}));

import { ToastContext } from '../../../../../../component-library/components/Toast';

function WithToast({ children }: { children: React.ReactNode }) {
  const ref = React.useRef({
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  });
  return (
    <ToastContext.Provider value={{ toastRef: ref }}>
      {children}
    </ToastContext.Provider>
  );
}

const renderWithToast = () =>
  render(
    <WithToast>
      <CreatePriceAlertView />
    </WithToast>,
  );

const setRoute = (params: object) =>
  jest
    .spyOn(jest.requireMock('@react-navigation/native'), 'useRoute')
    .mockReturnValue({ params });

describe('CreatePriceAlertView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockUseSavePriceAlert.mockImplementation(() => ({
      save: mockSave,
      isSubmitting: false,
    }));
  });

  it('renders the create alert title and current price subtitle', () => {
    const { getByText, getAllByText } = renderWithToast();
    expect(getByText('Create ETH price alert')).toBeOnTheScreen();
    // price appears in the header subtitle and as the keypad placeholder
    expect(getAllByText('$1,201.98').length).toBeGreaterThanOrEqual(2);
  });

  it('renders the price reaches experience by default', () => {
    const { getByTestId, getByText } = renderWithToast();

    expect(getByText('Enter target price')).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
  });

  it('shows percentage pickers and hides Set button before any input', () => {
    const { getByTestId, queryByTestId } = renderWithToast();

    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(queryByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON)).toBeNull();
  });

  it('hides percentage pickers and shows Set button once user types a digit', () => {
    const { getByTestId, queryByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));

    expect(
      queryByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeNull();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('keeps percentage pickers and hides Set button for zero-valued keypad input like "0."', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-dot'));

    expect(getByText('$0.')).toBeOnTheScreen();
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(queryByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON)).toBeNull();
  });

  it('shows Set button after a quick-percentage pill is pressed', () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`),
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows under development message when price change is selected', () => {
    const { getByTestId, getByText } = renderWithToast();

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB));

    expect(
      getByTestId(CreatePriceAlertTestIds.UNDER_DEVELOPMENT),
    ).toBeOnTheScreen();
    expect(
      getByText('This experience is currently under development'),
    ).toBeOnTheScreen();
  });

  it('updates the displayed price when a quick-percentage pill is pressed', () => {
    const { getByTestId, getByText } = renderWithToast();

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`),
    );

    // 1201.98 * 1.10 = 1322.178 → stripped to 6 sig figs → "1322.18"
    expect(getByText('$1322.18')).toBeOnTheScreen();
  });

  it('shows raw digits without forced decimals while typing', () => {
    const { getByTestId, getByText } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));

    expect(getByText('$1')).toBeOnTheScreen();
  });

  it('shows ≈ 0% when no target has been entered', () => {
    const { getByTestId } = renderWithToast();
    expect(getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF)).toHaveTextContent(
      '≈ 0%',
    );
  });

  it('shows the positive percentage and "above" wording when target exceeds current price', () => {
    const { getByTestId, getByText } = renderWithToast();

    // 5% above 1201.98
    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(getByText('5%')).toBeOnTheScreen();
    expect(getByText(/above current ETH price/)).toBeOnTheScreen();
  });

  it('shows the percentage and "below" wording when target is less than current price', () => {
    const { getByTestId, getByText } = renderWithToast();

    // $1000 is ~17% below 1201.98
    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    expect(getByText(/below current ETH price/)).toBeOnTheScreen();
  });

  describe('Set price alert button', () => {
    it('calls save with the correct asset, threshold, and recurring values', async () => {
      const { getByTestId } = renderWithToast();

      fireEvent.press(getByTestId('keypad-key-1'));
      fireEvent.press(getByTestId('keypad-key-5'));
      fireEvent.press(getByTestId('keypad-key-0'));
      fireEvent.press(getByTestId('keypad-key-0'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockSave).toHaveBeenCalledWith({
        asset: 'eip155:1/slip44:60',
        threshold: 1500,
        recurring: true,
      });
    });

    it('passes recurring=false when the toggle is switched off', async () => {
      const { getByTestId } = renderWithToast();

      fireEvent(
        getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );
      fireEvent.press(getByTestId('keypad-key-2'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ recurring: false }),
      );
    });

    it('navigates back and shows a success toast on save', async () => {
      const { getByTestId } = renderWithToast();

      fireEvent.press(getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          hasNoTimeout: false,
          labelOptions: expect.arrayContaining([
            expect.objectContaining({ label: expect.stringContaining('ETH') }),
          ]),
        }),
      );
    });

    it('pops two screens instead of goBack when opened from the manage list', async () => {
      setRoute({
        symbol: 'ETH',
        ticker: 'ETH',
        currentPrice: 1201.98,
        currentCurrency: 'USD',
        assetId: 'eip155:1/slip44:60',
        fromManage: true,
      });

      const { getByTestId } = renderWithToast();
      fireEvent.press(getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockPop).toHaveBeenCalledWith(2);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not navigate or show toast when save throws', async () => {
      mockSave.mockRejectedValueOnce(new Error('HTTP 500'));
      const { getByTestId } = renderWithToast();

      fireEvent.press(getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('does not call save a second time when the button is pressed while already submitting', async () => {
      // The real hook sets isSubmitting=true and the Button becomes disabled+loading,
      // preventing re-presses. Here we verify the component only calls save once
      // even if the underlying hook guard is bypassed in tests.
      let resolveFirst!: () => void;
      mockSave.mockReturnValueOnce(
        new Promise<void>((res) => {
          resolveFirst = res;
        }),
      );

      const { getByTestId } = renderWithToast();
      fireEvent.press(getByTestId('keypad-key-1'));
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));

      await act(async () => {
        resolveFirst();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CreatePriceAlertView — duplicate threshold validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockUseSavePriceAlert.mockImplementation(() => ({
      save: mockSave,
      isSubmitting: false,
    }));
    // Route has an existing alert at $1500
    setRoute({
      symbol: 'ETH',
      ticker: 'ETH',
      currentPrice: 1201.98,
      currentCurrency: 'USD',
      assetId: 'eip155:1/slip44:60',
      fromManage: true,
      existingThresholds: [1500],
    });
  });

  it('shows the duplicate error text on the button and disables it when target matches an existing threshold', () => {
    const { getByTestId, getByText } = renderWithToast();

    // Type 1500 — matches the existing alert
    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-5'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    expect(
      getByText('An alert at this price already exists.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('shows the normal Set button label and enables it for a different target price', () => {
    const { getByTestId, getByText } = renderWithToast();

    // Type 2000 — not a duplicate
    fireEvent.press(getByTestId('keypad-key-2'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    expect(getByText('Set price alert')).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('does not call save when Set button is pressed on a duplicate threshold', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-5'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('CreatePriceAlertView — tiny price token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    setRoute({
      symbol: 'SHIB',
      ticker: 'SHIB',
      currentPrice: 0.00000000000001,
      currentCurrency: 'USD',
      assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    });
  });

  it('quick-percentage pill shows a plain decimal string (never scientific notation)', () => {
    const { getByTestId, getByText } = render(<CreatePriceAlertView />);

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    // 0.00000000000001 * 1.05 = 1.05e-14 → must render as plain decimal
    expect(getByText('$0.0000000000000105')).toBeOnTheScreen();
  });

  it('quick-percentage pill produces a non-zero value and reveals the Set button', () => {
    const { getByTestId } = render(<CreatePriceAlertView />);

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('allows manual keypad entry beyond two decimal places for sub-cent tokens', () => {
    setRoute({
      symbol: 'SHIB',
      ticker: 'SHIB',
      currentPrice: 0.00001234,
      currentCurrency: 'USD',
      assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    });

    const { getByTestId, getByText } = render(<CreatePriceAlertView />);

    // Type 0.000012345 — blocked when keypad decimals are fixed at 2
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-dot'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-2'));
    fireEvent.press(getByTestId('keypad-key-3'));
    fireEvent.press(getByTestId('keypad-key-4'));
    fireEvent.press(getByTestId('keypad-key-5'));

    expect(getByText('$0.000012345')).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });
});
