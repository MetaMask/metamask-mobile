import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CreatePriceAlertView from './CreatePriceAlertView';
import { CreatePriceAlertTestIds } from '../../constants';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockSubmit = jest.fn();
const mockSubmitPercent = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockUseSubmitPriceAlert = jest.fn((_editingAlert?: unknown) => ({
  submit: mockSubmit,
  isSubmitting: false,
}));
const mockUseSubmitPercentAlert = jest.fn((_editingAlert?: unknown) => ({
  submit: mockSubmitPercent,
  isSubmitting: false,
}));
const mockSetQueryData = jest.fn();

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

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../../api', () => ({
  priceAlertsQueryKey: (assetId: string) => ['priceAlerts', assetId],
  useSubmitPriceAlert: (editingAlert?: unknown) =>
    mockUseSubmitPriceAlert(editingAlert),
  useSubmitPercentAlert: (editingAlert?: unknown) =>
    mockUseSubmitPercentAlert(editingAlert),
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
    mockSubmit.mockResolvedValue(undefined);
    mockSubmitPercent.mockResolvedValue(undefined);
    mockUseSubmitPriceAlert.mockImplementation(() => ({
      submit: mockSubmit,
      isSubmitting: false,
    }));
    mockUseSubmitPercentAlert.mockImplementation(() => ({
      submit: mockSubmitPercent,
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

  it('shows percentage pickers and Set button before any input', () => {
    const { getByTestId } = renderWithToast();

    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('keeps percentage pickers visible and enables Set button once user types a digit', () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));

    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('keeps percentage pickers visible and Set button disabled for zero-valued keypad input like "0."', () => {
    const { getByTestId, getByText } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-dot'));

    expect(getByText('$0.')).toBeOnTheScreen();
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('enables Set button after a quick-percentage pill is pressed', () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`),
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
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

    expect(getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF)).toHaveTextContent(
      /\+5%/,
    );
    expect(getByText(/above current ETH price/)).toBeOnTheScreen();
  });

  it('shows the negative percentage and "below" wording when target is less than current price', () => {
    const { getByTestId, getByText } = renderWithToast();

    // $1000 is ~17% below 1201.98
    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    expect(getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF)).toHaveTextContent(
      /-17%/,
    );
    expect(getByText(/below current ETH price/)).toBeOnTheScreen();
  });

  it('shows signed labels on quick percentage buttons', () => {
    const { getByTestId } = renderWithToast();

    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}--10`),
    ).toHaveTextContent('-10%');
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}--5`),
    ).toHaveTextContent('-5%');
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    ).toHaveTextContent('+5%');
    expect(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`),
    ).toHaveTextContent('+10%');
  });

  describe('Set price alert button', () => {
    it('calls submit with the correct asset, threshold, and recurring values', async () => {
      const { getByTestId } = renderWithToast();

      fireEvent.press(getByTestId('keypad-key-1'));
      fireEvent.press(getByTestId('keypad-key-5'));
      fireEvent.press(getByTestId('keypad-key-0'));
      fireEvent.press(getByTestId('keypad-key-0'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockSubmit).toHaveBeenCalledWith({
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

      expect(mockSubmit).toHaveBeenCalledWith(
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

    it('does not navigate but shows an error toast when submit throws', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('HTTP 500'));
      const { getByTestId } = renderWithToast();

      fireEvent.press(getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: 'Failed to save price alert. Please try again.',
            }),
          ]),
          hasNoTimeout: false,
        }),
      );
    });

    it('does not call submit a second time when the button is pressed while already submitting', async () => {
      let resolveFirst!: () => void;
      mockSubmit.mockReturnValueOnce(
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

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CreatePriceAlertView — duplicate threshold validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockUseSubmitPriceAlert.mockImplementation(() => ({
      submit: mockSubmit,
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

  it('does not call submit when Set button is pressed on a duplicate threshold', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-5'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

describe('CreatePriceAlertView — tiny price token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
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

    // 0.00000000000001 * 1.05 = 1.05e-14 → capped at 15 decimal places → rounded to "0.000000000000011"
    expect(getByText('$0.000000000000011')).toBeOnTheScreen();
  });

  it('quick-percentage pill produces a non-zero value and enables the Set button', () => {
    const { getByTestId } = render(<CreatePriceAlertView />);

    fireEvent.press(
      getByTestId(`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`),
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
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

  it('enforces the 15-decimal cap — typing a 16th decimal digit is blocked', () => {
    // currentPrice ~1e-10 → dynamic decimal calc would exceed 15 without the cap
    setRoute({
      symbol: 'SHIB',
      ticker: 'SHIB',
      currentPrice: 0.0000000001,
      currentCurrency: 'USD',
      assetId: 'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    });

    const { getByTestId, getByText } = render(<CreatePriceAlertView />);

    // Enter "0." then 15 digits
    fireEvent.press(getByTestId('keypad-key-dot'));
    for (let i = 0; i < 15; i++) {
      fireEvent.press(getByTestId('keypad-key-1'));
    }
    // The 16th digit must be blocked
    fireEvent.press(getByTestId('keypad-key-2'));

    expect(getByText('$0.111111111111111')).toBeOnTheScreen();
  });
});

describe('CreatePriceAlertView — edit mode', () => {
  const editingAlert = {
    id: 'alert-42',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    type: 'absolute_price' as const,
    threshold: 1500,
    recurring: true,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockUseSubmitPriceAlert.mockImplementation(() => ({
      submit: mockSubmit,
      isSubmitting: false,
    }));
    setRoute({
      symbol: 'ETH',
      ticker: 'ETH',
      currentPrice: 1201.98,
      currentCurrency: 'USD',
      assetId: 'eip155:1/slip44:60',
      fromManage: true,
      existingThresholds: [1500],
      editingAlert,
    });
  });

  it('renders the edit title instead of the create title', () => {
    const { getByText } = renderWithToast();
    expect(getByText('Edit ETH price alert')).toBeOnTheScreen();
  });

  it('pre-populates the keypad with the existing threshold', () => {
    const { getByText } = renderWithToast();
    expect(getByText('$1500')).toBeOnTheScreen();
  });

  it('shows the Set button immediately because threshold is pre-populated', () => {
    const { getByTestId } = renderWithToast();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('shows "Update price alert" as the button label', () => {
    const { getByText } = renderWithToast();
    expect(getByText('Update price alert')).toBeOnTheScreen();
  });

  it('pre-sets the recurring toggle from the existing alert', () => {
    const { getByTestId } = renderWithToast();
    expect(getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE)).toHaveProp(
      'value',
      true,
    );
  });

  it('disables the button when threshold and recurring are unchanged', () => {
    const { getByTestId } = renderWithToast();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('enables the button after the threshold is changed', () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-key-2'));

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('enables the button when only the recurring toggle changes', () => {
    const { getByTestId } = renderWithToast();

    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('does not treat the own threshold as a duplicate', () => {
    const { getByTestId, queryByText } = renderWithToast();

    expect(queryByText('An alert at this price already exists.')).toBeNull();
    expect(
      getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toHaveTextContent('An alert at this price already exists.');
  });

  it('calls submit with threshold and recurring on update', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      threshold: 1500,
      recurring: false,
    });
  });

  it('updates the query cache with the new threshold and recurring after a successful update', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['priceAlerts', 'eip155:1/slip44:60'],
      expect.any(Function),
    );

    const updater = mockSetQueryData.mock.calls[0][1] as (
      prev: (typeof editingAlert)[] | undefined,
    ) => (typeof editingAlert)[] | undefined;

    // Cache miss → leave it undefined so ManagePriceAlertsView can refetch
    expect(updater(undefined)).toBeUndefined();

    // Cache hit → update only the matching alert
    const updated = updater([editingAlert]);
    expect(updated).toEqual([
      { ...editingAlert, threshold: 1500, recurring: false },
    ]);
  });

  it('calls goBack (not pop) after a successful update', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockPop).not.toHaveBeenCalled();
  });

  it('passes editingAlert to useSubmitPriceAlert', () => {
    renderWithToast();
    expect(mockUseSubmitPriceAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alert-42' }),
    );
  });
});

describe('CreatePriceAlertView — analytics', () => {
  const baseRoute = {
    symbol: 'ETH',
    ticker: 'ETH',
    currentPrice: 1201.98,
    currentCurrency: 'USD',
    assetId: 'eip155:1/slip44:60',
  };

  const editingAlert = {
    id: 'alert-42',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    type: 'absolute_price' as const,
    threshold: 1500,
    recurring: true,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  const mockAnalytics = jest.mocked(useAnalytics)();

  // Locate the builder double created for a specific event, since several
  // events may be tracked within a single render (e.g. Creation Initiated on
  // mount followed by Created on save).
  const builderForEvent = (event: unknown) => {
    const calls = jest.mocked(mockAnalytics.createEventBuilder).mock.calls;
    const idx = calls.findIndex((c) => c[0] === event);
    return jest.mocked(mockAnalytics.createEventBuilder).mock.results[idx]
      .value;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockUseSubmitPriceAlert.mockImplementation(() => ({
      submit: mockSubmit,
      isSubmitting: false,
    }));
    setRoute(baseRoute);
  });

  it('tracks Price Alert Creation Initiated on mount with has_existing_alert false', () => {
    renderWithToast();

    expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED,
    );
    expect(
      builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED)
        .addProperties,
    ).toHaveBeenCalledWith({
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      has_existing_alert: false,
    });
  });

  it('sets has_existing_alert true when existing thresholds are passed through', () => {
    setRoute({ ...baseRoute, fromManage: true, existingThresholds: [1500] });

    renderWithToast();

    expect(
      builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED)
        .addProperties,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ has_existing_alert: true }),
    );
  });

  it('tracks Price Alert Creation Interaction (created) on save', async () => {
    const { getByTestId } = renderWithToast();

    fireEvent.press(getByTestId('keypad-key-1'));
    fireEvent.press(getByTestId('keypad-key-5'));
    fireEvent.press(getByTestId('keypad-key-0'));
    fireEvent.press(getByTestId('keypad-key-0'));

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
    );
    expect(
      builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
        .addProperties,
    ).toHaveBeenCalledWith({
      interaction_type: 'created',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'threshold',
      alert_value: 1500,
      alert_recurring: true,
      alert_active: true,
    });
  });

  it('records alert_recurring false when the toggle is off', async () => {
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

    expect(
      builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
        .addProperties,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'created',
        alert_value: 2,
        alert_recurring: false,
        alert_active: true,
      }),
    );
  });

  it('tracks Price Alert Creation Interaction (updated) when editing', async () => {
    setRoute({
      ...baseRoute,
      fromManage: true,
      existingThresholds: [1500],
      editingAlert,
    });

    const { getByTestId } = renderWithToast();

    fireEvent(
      getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );

    await act(async () => {
      fireEvent.press(getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON));
    });

    expect(mockAnalytics.createEventBuilder).not.toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED,
    );
    expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
    );
    expect(
      builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
        .addProperties,
    ).toHaveBeenCalledWith({
      interaction_type: 'updated',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'threshold',
      alert_value: 1500,
      alert_recurring: false,
      alert_active: true,
      prev_alert_value: 1500,
      prev_alert_recurring: true,
      prev_alert_active: true,
    });
  });
});

describe('CreatePriceAlertView — percent-change alerts', () => {
  const baseRoute = {
    symbol: 'ETH',
    ticker: 'ETH',
    currentPrice: 1201.98,
    currentCurrency: 'USD',
    assetId: 'eip155:1/slip44:60',
    initialType: 'percent_change' as const,
  };

  const editingPercentAlert = {
    id: 'percent-alert-1',
    userId: 'user-1',
    asset: 'eip155:1/slip44:60',
    type: 'percent_change' as const,
    threshold: 10.5,
    period: '1h' as const,
    direction: 'down' as const,
    recurring: true,
    active: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitPercent.mockResolvedValue(undefined);
    mockUseSubmitPercentAlert.mockImplementation(() => ({
      submit: mockSubmitPercent,
      isSubmitting: false,
    }));
    setRoute(baseRoute);
  });

  it('renders percent controls when percent change is preselected', () => {
    const screen = renderWithToast();

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).not.toBeOnTheScreen();
  });

  it('submits the selected percent threshold, period, direction, and recurrence', async () => {
    const screen = renderWithToast();

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    );
    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );
    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockSubmitPercent).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      threshold: 10,
      period: '1h',
      direction: 'down',
      recurring: false,
    });
  });

  it('disables saving when the percent tuple matches another alert', () => {
    setRoute({
      ...baseRoute,
      existingPercentAlerts: [
        {
          ...editingPercentAlert,
          threshold: 10,
          period: '24h',
          direction: 'up',
        },
      ],
    });
    const screen = renderWithToast();

    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toHaveTextContent('An alert with this configuration already exists.');
  });

  it('prepopulates percent edit values and locks immutable controls', () => {
    setRoute({
      ...baseRoute,
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });
    const screen = renderWithToast();

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_INPUT),
    ).toHaveTextContent('10.5%');
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.DIRECTION_TOGGLE),
    ).toBeDisabled();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('updates a percent alert after recurrence changes', async () => {
    setRoute({
      ...baseRoute,
      editingAlert: editingPercentAlert,
      existingPercentAlerts: [editingPercentAlert],
    });
    const screen = renderWithToast();

    fireEvent(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      'valueChange',
      false,
    );
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockUseSubmitPercentAlert).toHaveBeenCalledWith(editingPercentAlert);
    expect(mockSubmitPercent).toHaveBeenCalledWith({
      asset: 'eip155:1/slip44:60',
      threshold: 10.5,
      period: '1h',
      direction: 'down',
      recurring: false,
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['priceAlerts', 'eip155:1/slip44:60'],
      expect.any(Function),
    );
  });

  it('tracks percent-specific properties after creation', async () => {
    const mockAnalytics = jest.mocked(useAnalytics)();
    const screen = renderWithToast();

    fireEvent.press(screen.getByTestId('keypad-key-5'));
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });
    const interactionCallIndex = jest
      .mocked(mockAnalytics.createEventBuilder)
      .mock.calls.findIndex(
        ([event]) =>
          event === MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      );
    const interactionBuilder = jest.mocked(mockAnalytics.createEventBuilder)
      .mock.results[interactionCallIndex].value;

    expect(interactionBuilder.addProperties).toHaveBeenCalledWith({
      interaction_type: 'created',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'percent_change',
      period: '24h',
      direction: 'up',
      alert_value: 5,
      alert_recurring: true,
      alert_active: true,
    });
  });

  it('shows an error toast when percent submission rejects', async () => {
    mockSubmitPercent.mockRejectedValueOnce(new Error('HTTP 500'));
    const screen = renderWithToast();

    fireEvent.press(screen.getByTestId('keypad-key-5'));
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: 'Failed to save price alert. Please try again.',
          }),
        ]),
      }),
    );
  });
});
