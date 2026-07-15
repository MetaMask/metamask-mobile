import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import {
  type AbsolutePriceAlert,
  CreatePriceAlertTestIds,
} from '../../constants';
import AbsolutePriceAlertForm from './AbsolutePriceAlertForm';

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockSubmit = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockSetQueryData = jest.fn();
const mockUseSubmitPriceAlert = jest.fn((_editingAlert?: unknown) => ({
  submit: mockSubmit,
  isSubmitting: false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, pop: mockPop }),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../../api', () => ({
  priceAlertsQueryKey: (assetId: string) => ['priceAlerts', assetId],
  useSubmitPriceAlert: (editingAlert?: unknown) =>
    mockUseSubmitPriceAlert(editingAlert),
}));

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

const baseProps: React.ComponentProps<typeof AbsolutePriceAlertForm> = {
  assetId: 'eip155:1/slip44:60',
  displayTicker: 'ETH',
  currentPrice: 1201.98,
  currentCurrency: 'USD',
};

const editingAlert: AbsolutePriceAlert = {
  id: 'alert-42',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  type: 'absolute_price',
  threshold: 1500,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const renderForm = (
  overrides: Partial<React.ComponentProps<typeof AbsolutePriceAlertForm>> = {},
) =>
  render(
    <WithToast>
      <AbsolutePriceAlertForm {...baseProps} {...overrides} />
    </WithToast>,
  );

const enter1500 = (getByTestId: ReturnType<typeof render>['getByTestId']) => {
  fireEvent.press(getByTestId('keypad-key-1'));
  fireEvent.press(getByTestId('keypad-key-5'));
  fireEvent.press(getByTestId('keypad-key-0'));
  fireEvent.press(getByTestId('keypad-key-0'));
};

const mockAnalytics = jest.mocked(useAnalytics)();
const builderForEvent = (event: unknown) => {
  const calls = jest.mocked(mockAnalytics.createEventBuilder).mock.calls;
  const index = calls.findIndex(([candidate]) => candidate === event);
  return jest.mocked(mockAnalytics.createEventBuilder).mock.results[index]
    .value;
};

describe('AbsolutePriceAlertForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockUseSubmitPriceAlert.mockImplementation(() => ({
      submit: mockSubmit,
      isSubmitting: false,
    }));
  });

  it('renders the absolute price controls', () => {
    const screen = renderForm();

    expect(screen.getByText('Enter target price')).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.TARGET_PRICE_INPUT),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders percentage pickers and a disabled Set button before input', () => {
    const screen = renderForm();

    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('keeps percentage pickers visible and enables saving after digit input', () => {
    const screen = renderForm();

    fireEvent.press(screen.getByTestId('keypad-key-1'));

    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('keeps saving disabled for zero-valued decimal input', () => {
    const screen = renderForm();

    fireEvent.press(screen.getByTestId('keypad-key-dot'));

    expect(screen.getByText('$0.')).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).toBeDisabled();
  });

  it('enables saving after a quick-percentage selection', () => {
    const screen = renderForm();

    fireEvent.press(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`,
      ),
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
    ).not.toBeDisabled();
  });

  it('updates the displayed price from a quick-percentage selection', () => {
    const screen = renderForm();

    fireEvent.press(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`,
      ),
    );

    expect(screen.getByText('$1322.18')).toBeOnTheScreen();
  });

  it('displays raw digits without forced decimals while typing', () => {
    const screen = renderForm();

    fireEvent.press(screen.getByTestId('keypad-key-1'));

    expect(screen.getByText('$1')).toBeOnTheScreen();
  });

  it('displays an approximate zero percent before input', () => {
    const screen = renderForm();

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF),
    ).toHaveTextContent('≈ 0%');
  });

  it('displays positive percentage and above wording for a higher target', () => {
    const screen = renderForm();

    fireEvent.press(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF),
    ).toHaveTextContent(/\+5%/);
    expect(screen.getByText(/above current ETH price/)).toBeOnTheScreen();
  });

  it('displays negative percentage and below wording for a lower target', () => {
    const screen = renderForm();

    fireEvent.press(screen.getByTestId('keypad-key-1'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));
    fireEvent.press(screen.getByTestId('keypad-key-0'));

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERCENT_DIFF),
    ).toHaveTextContent(/-17%/);
    expect(screen.getByText(/below current ETH price/)).toBeOnTheScreen();
  });

  it('displays signed quick-percentage labels', () => {
    const screen = renderForm();

    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}--10`,
      ),
    ).toHaveTextContent('-10%');
    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}--5`,
      ),
    ).toHaveTextContent('-5%');
    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
      ),
    ).toHaveTextContent('+5%');
    expect(
      screen.getByTestId(
        `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-10`,
      ),
    ).toHaveTextContent('+10%');
  });

  describe('saving', () => {
    it('submits the asset, threshold, and recurring values', async () => {
      const screen = renderForm();
      enter1500(screen.getByTestId);

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
      });

      expect(mockSubmit).toHaveBeenCalledWith({
        asset: 'eip155:1/slip44:60',
        threshold: 1500,
        recurring: true,
      });
    });

    it('submits recurring false after the toggle is switched off', async () => {
      const screen = renderForm();
      fireEvent(
        screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );
      fireEvent.press(screen.getByTestId('keypad-key-2'));

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ recurring: false }),
      );
    });

    it('navigates back and displays a success toast after saving', async () => {
      const screen = renderForm();
      fireEvent.press(screen.getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
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

    it('pops two screens when opened from the manage list', async () => {
      const screen = renderForm({ fromManage: true });
      fireEvent.press(screen.getByTestId('keypad-key-1'));

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
      });

      expect(mockPop).toHaveBeenCalledWith(2);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('displays an error toast without navigating when submission rejects', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('HTTP 500'));
      const screen = renderForm();
      fireEvent.press(screen.getByTestId('keypad-key-1'));

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
          hasNoTimeout: false,
        }),
      );
    });

    it('submits once while the first submission remains pending', async () => {
      let resolveFirst!: () => void;
      mockSubmit.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }),
      );
      const screen = renderForm();
      fireEvent.press(screen.getByTestId('keypad-key-1'));
      fireEvent.press(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      );

      await act(async () => {
        resolveFirst();
      });

      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('duplicate threshold validation', () => {
    it('displays the duplicate label and disables saving for a matching threshold', () => {
      const screen = renderForm({ existingThresholds: [1500] });
      enter1500(screen.getByTestId);

      expect(
        screen.getByText('An alert at this price already exists.'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).toBeDisabled();
    });

    it('displays the normal label and enables saving for a different threshold', () => {
      const screen = renderForm({ existingThresholds: [1500] });

      fireEvent.press(screen.getByTestId('keypad-key-2'));
      fireEvent.press(screen.getByTestId('keypad-key-0'));
      fireEvent.press(screen.getByTestId('keypad-key-0'));
      fireEvent.press(screen.getByTestId('keypad-key-0'));

      expect(screen.getByText('Set price alert')).toBeOnTheScreen();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });

    it('does not submit a duplicate threshold', async () => {
      const screen = renderForm({ existingThresholds: [1500] });
      enter1500(screen.getByTestId);

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('tiny price tokens', () => {
    const tinyAsset =
      'eip155:1/erc20:0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';

    it('displays quick-percentage values without scientific notation', () => {
      const screen = renderForm({
        assetId: tinyAsset,
        displayTicker: 'SHIB',
        currentPrice: 0.00000000000001,
      });

      fireEvent.press(
        screen.getByTestId(
          `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
        ),
      );

      expect(screen.getByText('$0.000000000000011')).toBeOnTheScreen();
    });

    it('enables saving for a non-zero tiny quick-percentage value', () => {
      const screen = renderForm({
        assetId: tinyAsset,
        displayTicker: 'SHIB',
        currentPrice: 0.00000000000001,
      });

      fireEvent.press(
        screen.getByTestId(
          `${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-5`,
        ),
      );

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });

    it('accepts manual keypad input beyond two decimals', () => {
      const screen = renderForm({
        assetId: tinyAsset,
        displayTicker: 'SHIB',
        currentPrice: 0.00001234,
      });

      for (const key of [
        '0',
        'dot',
        '0',
        '0',
        '0',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
      ]) {
        fireEvent.press(screen.getByTestId(`keypad-key-${key}`));
      }

      expect(screen.getByText('$0.000012345')).toBeOnTheScreen();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('blocks a sixteenth decimal digit', () => {
      const screen = renderForm({
        assetId: tinyAsset,
        displayTicker: 'SHIB',
        currentPrice: 0.0000000001,
      });
      fireEvent.press(screen.getByTestId('keypad-key-dot'));
      for (let index = 0; index < 15; index++) {
        fireEvent.press(screen.getByTestId('keypad-key-1'));
      }

      fireEvent.press(screen.getByTestId('keypad-key-2'));

      expect(screen.getByText('$0.111111111111111')).toBeOnTheScreen();
    });
  });

  describe('editing', () => {
    const renderEditingForm = () =>
      renderForm({
        editingAlert,
        existingThresholds: [1500],
        fromManage: true,
      });

    it('prepopulates the existing threshold', () => {
      const screen = renderEditingForm();

      expect(screen.getByText('$1500')).toBeOnTheScreen();
    });

    it('renders the Set button for a prepopulated threshold', () => {
      const screen = renderEditingForm();

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('displays the update button label', () => {
      const screen = renderEditingForm();

      expect(screen.getByText('Update price alert')).toBeOnTheScreen();
    });

    it('preselects recurring from the existing alert', () => {
      const screen = renderEditingForm();

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
      ).toHaveProp('value', true);
    });

    it('disables saving while threshold and recurring remain unchanged', () => {
      const screen = renderEditingForm();

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).toBeDisabled();
    });

    it('enables saving after the threshold changes', () => {
      const screen = renderEditingForm();

      fireEvent.press(screen.getByTestId('keypad-delete-button'));
      fireEvent.press(screen.getByTestId('keypad-key-2'));

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });

    it('enables saving after only recurring changes', () => {
      const screen = renderEditingForm();

      fireEvent(
        screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );

      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toBeDisabled();
    });

    it('excludes the edited alert threshold from duplicate validation', () => {
      const screen = renderEditingForm();

      expect(
        screen.queryByText('An alert at this price already exists.'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
      ).not.toHaveTextContent('An alert at this price already exists.');
    });

    it('submits updated threshold and recurring values', async () => {
      const screen = renderEditingForm();
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

      expect(mockSubmit).toHaveBeenCalledWith({
        asset: 'eip155:1/slip44:60',
        threshold: 1500,
        recurring: false,
      });
    });

    it('patches the matching cached alert after updating', async () => {
      const screen = renderEditingForm();
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

      expect(mockSetQueryData).toHaveBeenCalledWith(
        ['priceAlerts', 'eip155:1/slip44:60'],
        expect.any(Function),
      );
      const updater = mockSetQueryData.mock.calls[0][1] as (
        previous: AbsolutePriceAlert[] | undefined,
      ) => AbsolutePriceAlert[] | undefined;
      expect(updater(undefined)).toBeUndefined();
      expect(updater([editingAlert])).toEqual([
        { ...editingAlert, threshold: 1500, recurring: false },
      ]);
    });

    it('navigates back without popping after updating', async () => {
      const screen = renderEditingForm();
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

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockPop).not.toHaveBeenCalled();
    });

    it('passes the edited alert to the submit hook', () => {
      renderEditingForm();

      expect(mockUseSubmitPriceAlert).toHaveBeenCalledWith(editingAlert);
    });
  });

  describe('analytics', () => {
    it('tracks threshold properties after creation', async () => {
      const screen = renderForm();
      enter1500(screen.getByTestId);

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
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

    it('tracks recurring false after creation with recurrence disabled', async () => {
      const screen = renderForm();
      fireEvent(
        screen.getByTestId(CreatePriceAlertTestIds.RECURRING_TOGGLE),
        'valueChange',
        false,
      );
      fireEvent.press(screen.getByTestId('keypad-key-2'));

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(CreatePriceAlertTestIds.SET_ALERT_BUTTON),
        );
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

    it('tracks previous and updated threshold properties while editing', async () => {
      const screen = renderForm({
        editingAlert,
        existingThresholds: [1500],
        fromManage: true,
      });
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
});
