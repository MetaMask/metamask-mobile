import '../../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../../locales/i18n';
import { renderBridgeView } from '../../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { setRecurringPriceRange } from '../../../../../../core/redux/slices/bridge';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { RecurringScheduleFieldsSelectorsIDs } from '../../../components/RecurringScheduleFields';
import { RecurringIntervalSheetSelectorsIDs } from '../../../components/RecurringIntervalSheet';
import { RecurringRepeatInfoSheetSelectorsIDs } from '../../../components/RecurringRepeatInfoSheet';
import { PriceRangeRowSelectorsIDs } from '../../../components/PriceRangeRow';
import { PriceRangeSheetSelectorsIDs } from '../../../components/PriceRangeSheet';
import { OrdersTabsSelectorsIDs } from '../../../components/OrdersTabs';
import { BuildQuoteSelectors } from '../../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import {
  applyPercentToPrice,
  formatExchangeRate,
  formatPriceRangeLabel,
  type RecurringPriceRange,
} from '../../../utils/priceRange';

const errorColor = lightTheme.colors.error.default;
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const ETH_FIAT_RATE = 2000;
const MUSD_ETH_PRICE = 0.0005;
const MUSD_FIAT_RATE = ETH_FIAT_RATE * MUSD_ETH_PRICE;
const STORED_USD_PRICE_RANGE: RecurringPriceRange = {
  tokenSide: 'dest',
  currency: 'usd',
  min: '0.90',
  max: '1.10',
};

function renderRecurringPriceRangeView({
  currentCurrency = 'usd',
}: {
  currentCurrency?: string;
} = {}) {
  return renderBridgeView({
    deterministicFiat: true,
    overrides: {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x1': {
                '0x0000000000000000000000000000000000000000': {
                  tokenAddress: '0x0000000000000000000000000000000000000000',
                  currency: 'ETH',
                  price: 1,
                },
                [MUSD_ADDRESS]: {
                  tokenAddress: MUSD_ADDRESS,
                  currency: 'ETH',
                  price: MUSD_ETH_PRICE,
                },
              },
            },
          },
          ...(currentCurrency
            ? { CurrencyRateController: { currentCurrency } }
            : {}),
        },
      },
    },
  });
}

async function openRecurringTab(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent.press(
    renderResult.getByTestId(BridgeViewSelectorsIDs.RECURRING_TAB),
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER),
    ).toBeOnTheScreen();
  });
}

async function openEveryKeypad(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent(
    renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    'pressIn',
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    ).toBeOnTheScreen();
  });
}

async function openRepeatKeypad(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent(
    renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT),
    'pressIn',
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    ).toBeOnTheScreen();
  });
}

async function openAmountKeypad(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent(
    renderResult.getByTestId(
      BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_INPUT,
    ),
    'pressIn',
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    ).toBeOnTheScreen();
  });
}

async function seedPriceRangeAfterTokens(
  renderResult: ReturnType<typeof renderBridgeView>,
  priceRange: RecurringPriceRange,
) {
  await waitFor(() => {
    expect(renderResult.store.getState().bridge.destToken?.symbol).toBe('mUSD');
  });
  act(() => {
    renderResult.store.dispatch(setRecurringPriceRange(priceRange));
  });
}

async function openPriceRangeSheet(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent.press(renderResult.getByTestId(PriceRangeRowSelectorsIDs.ROW));

  await waitFor(() => {
    expect(
      renderResult.getByTestId(PriceRangeSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });
  await waitFor(() => {
    expect(
      renderResult.getByText(
        strings('bridge.recurring.price_range.min_token_price', {
          symbol: 'mUSD',
        }),
      ),
    ).toBeOnTheScreen();
  });
}

async function openPriceRangeKeypad(
  renderResult: ReturnType<typeof renderBridgeView>,
  field: 'min' | 'max',
) {
  fireEvent(
    renderResult.getByTestId(
      field === 'min'
        ? PriceRangeSheetSelectorsIDs.MIN_INPUT
        : PriceRangeSheetSelectorsIDs.MAX_INPUT,
    ),
    'pressIn',
  );

  await waitFor(() => {
    expect(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    ).toBeOnTheScreen();
  });
}

async function typePriceRangeDigits(
  renderResult: ReturnType<typeof renderBridgeView>,
  digits: string,
) {
  for (const digit of digits) {
    fireEvent.press(
      renderResult.getByTestId(
        digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`,
      ),
    );
  }
}

async function selectPriceRangeSourceToken(
  renderResult: ReturnType<typeof renderBridgeView>,
) {
  fireEvent.press(
    renderResult.getByTestId(
      PriceRangeSheetSelectorsIDs.TOKEN_OPTION('source'),
    ),
  );

  await waitFor(() => {
    expect(
      renderResult.getByText(
        strings('bridge.recurring.price_range.min_token_price', {
          symbol: 'ETH',
        }),
      ),
    ).toBeOnTheScreen();
  });
}

describeForPlatforms('BridgeRecurringBuyView', () => {
  it('shows default every 1 hour and repeat 10 after opening the recurring tab', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);

    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('1');
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    ).toHaveTextContent(strings('bridge.recurring.unit.hour'));
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveDisplayValue('10');
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).not.toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).not.toHaveStyle({ color: errorColor });
  });

  it('appends keypad digits to the every value', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(renderResult.getByTestId('keypad-key-2'));

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('12');
    });
  });

  it('updates only the repeat value when the repeat input is focused', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
      'pressIn',
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });
    fireEvent.press(renderResult.getByTestId('keypad-key-1'));

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
        ),
      ).toHaveDisplayValue('101');
    });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('1');
  });

  it('closes the keypad when tapping outside it', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.CONTAINER),
      'responderRelease',
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  it('keeps every at 0 and invalid after the keypad is closed', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('0');
    });
    fireEvent(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.CONTAINER),
      'responderRelease',
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('0');
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.queryByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_ERROR,
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps repeat at 0 and invalid after the keypad is closed', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
      'pressIn',
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
        ),
      ).toHaveDisplayValue('0');
    });
    fireEvent(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.CONTAINER),
      'responderRelease',
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveDisplayValue('0');
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.queryByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_ERROR,
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps a 0 every value after leaving and returning to the recurring tab', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('0');
    });

    fireEvent.press(
      renderResult.getByTestId(BridgeViewSelectorsIDs.MARKET_TAB),
    );
    await waitFor(() => {
      expect(
        renderResult.queryByTestId(
          RecurringScheduleFieldsSelectorsIDs.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });

    await openRecurringTab(renderResult);

    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('0');
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveStyle({ color: errorColor });
  });

  it('does not add a decimal when the period key is pressed', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(renderResult.getByTestId('keypad-key-dot'));

    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('1');
  });

  it('commits the selected interval unit on confirm', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.OPTION('day'),
      ),
    );
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
        ),
      ).toHaveTextContent(strings('bridge.recurring.unit.day'));
    });
  });

  it('commits month as the interval unit on confirm', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.OPTION('month'),
      ),
    );
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
        ),
      ).toHaveTextContent(strings('bridge.recurring.unit.month'));
    });
  });

  it('opens the repeat info sheet from the info icon', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INFO_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringRepeatInfoSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(RecurringRepeatInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(strings('bridge.recurring.repeat_info_body'));
  });

  it('closes the repeat info sheet from the close button', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INFO_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringRepeatInfoSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringRepeatInfoSheetSelectorsIDs.CLOSE_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(RecurringRepeatInfoSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
    });
  });

  it('keeps the previous interval unit when the sheet is dismissed', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.OPTION('week'),
      ),
    );
    fireEvent.press(
      renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.CLOSE_BUTTON),
    );

    await waitFor(() => {
      expect(
        renderResult.queryByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
    });
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    ).toHaveTextContent(strings('bridge.recurring.unit.hour'));
  });

  it('resets every to 1 when confirming a unit change', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(renderResult.getByTestId('keypad-key-2'));
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('2');
    });

    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.OPTION('day'),
      ),
    );
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
        ),
      ).toHaveTextContent(strings('bridge.recurring.unit.day'));
    });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveDisplayValue('1');
  });

  it('shows Max is 24 when every exceeds the hour unit max', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(renderResult.getByTestId('keypad-key-2'));
    fireEvent.press(renderResult.getByTestId('keypad-key-5'));
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('25');
    });

    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_ERROR),
    ).toHaveTextContent(strings('bridge.recurring.max_is', { max: 24 }));
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).not.toHaveStyle({ color: errorColor });
    expect(
      renderResult.queryByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_ERROR,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows Max is 180 on repeat when 1 day times 181 exceeds 180 days', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    fireEvent.press(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(RecurringIntervalSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.OPTION('day'),
      ),
    );
    fireEvent.press(
      renderResult.getByTestId(
        RecurringIntervalSheetSelectorsIDs.CONFIRM_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_UNIT_BUTTON,
        ),
      ).toHaveTextContent(strings('bridge.recurring.unit.day'));
    });

    await openRepeatKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(renderResult.getByTestId('keypad-key-1'));
    fireEvent.press(renderResult.getByTestId('keypad-key-8'));
    fireEvent.press(renderResult.getByTestId('keypad-key-1'));
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
        ),
      ).toHaveDisplayValue('181');
    });

    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.REPEAT_ERROR),
    ).toHaveTextContent(strings('bridge.recurring.max_is', { max: 180 }));
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).not.toHaveStyle({ color: errorColor });
    expect(
      renderResult.queryByTestId(
        RecurringScheduleFieldsSelectorsIDs.EVERY_ERROR,
      ),
    ).not.toBeOnTheScreen();
  });

  it('marks the repeat value invalid when it is 0', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openRepeatKeypad(renderResult);
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    fireEvent.press(
      renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
    );
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
        ),
      ).toHaveDisplayValue('0');
    });

    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).not.toHaveStyle({ color: errorColor });
    expect(
      renderResult.queryByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_ERROR,
      ),
    ).not.toBeOnTheScreen();
  });

  describe('swap inputs', () => {
    it('renders the source and destination token areas above the schedule fields', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);

      expect(
        renderResult.getByTestId(
          BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_AREA,
        ),
      ).toBeOnTheScreen();
      expect(
        renderResult.getByTestId(
          BridgeViewSelectorsIDs.RECURRING_DEST_TOKEN_AREA,
        ),
      ).toBeOnTheScreen();
      expect(
        renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('opens the keypad with the amount quick picks when the source amount is pressed', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openAmountKeypad(renderResult);

      expect(renderResult.getByText('25%')).toBeOnTheScreen();
      expect(
        renderResult.queryByTestId(
          BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD,
        ),
      ).not.toBeOnTheScreen();
    });

    it('replaces amount quick picks with the keypad confirm button after a source amount is entered', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openAmountKeypad(renderResult);
      fireEvent.press(renderResult.getByTestId('keypad-key-2'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD,
          ),
        ).toBeOnTheScreen();
      });
      expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();
    });

    it('reuses the same keypad for the every field after the amount keypad was open', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openAmountKeypad(renderResult);
      expect(renderResult.getByText('25%')).toBeOnTheScreen();

      fireEvent(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
        'pressIn',
      );

      await waitFor(() => {
        expect(
          renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
        ).toBeOnTheScreen();
      });
      expect(renderResult.getByText('25%')).toBeOnTheScreen();

      fireEvent.press(renderResult.getByTestId('keypad-key-2'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
          ),
        ).toHaveDisplayValue('12');
      });
    });

    it('keeps the keypad confirm button when the every field is focused after an amount is entered', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openAmountKeypad(renderResult);
      fireEvent.press(renderResult.getByTestId('keypad-key-2'));
      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD,
          ),
        ).toBeOnTheScreen();
      });

      fireEvent(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
        'pressIn',
      );

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD,
          ),
        ).toBeOnTheScreen();
      });
      expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();
    });

    it('returns the keypad to the amount after the schedule was edited', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openEveryKeypad(renderResult);
      fireEvent.press(renderResult.getByTestId('keypad-key-2'));
      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
          ),
        ).toHaveDisplayValue('12');
      });

      await openAmountKeypad(renderResult);
      fireEvent.press(renderResult.getByTestId('keypad-key-3'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_INPUT,
          ),
        ).toHaveDisplayValue('3');
      });
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('12');
    });

    it('shows You get on dest and does not fill a dest amount after source amount is entered', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openAmountKeypad(renderResult);
      fireEvent.press(renderResult.getByTestId('keypad-key-2'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            BridgeViewSelectorsIDs.RECURRING_SOURCE_TOKEN_INPUT,
          ),
        ).toHaveDisplayValue('2');
      });
      expect(
        renderResult.getByTestId(BridgeViewSelectorsIDs.RECURRING_DEST_YOU_GET),
      ).toBeOnTheScreen();
      expect(
        renderResult.getByText(strings('bridge.recurring.you_get')),
      ).toBeOnTheScreen();
      expect(
        renderResult.queryByTestId(
          BridgeViewSelectorsIDs.RECURRING_DEST_TOKEN_INPUT,
        ),
      ).not.toBeOnTheScreen();
      expect(
        renderResult.getByTestId(
          BridgeViewSelectorsIDs.RECURRING_DEST_TOKEN_AREA,
        ),
      ).toBeOnTheScreen();
    });
  });

  it('shows a filled history row after pressing the History tab', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);

    const pair = strings('bridge.recurring.pair', {
      source: 'ETH',
      dest: 'USDC',
    });
    const scheduleSummary = strings('bridge.recurring.schedule_summary', {
      interval: '1 day',
      count: '5',
    });

    expect(renderResult.getAllByText(pair)).toHaveLength(2);
    expect(
      renderResult.getByText(strings('bridge.all_networks')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText(scheduleSummary)).toBeOnTheScreen();
    expect(
      renderResult.getByText(strings('bridge.recurring.filled')),
    ).toBeOnTheScreen();

    fireEvent.press(
      renderResult.getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB),
    );

    await waitFor(() => {
      expect(renderResult.queryByText(scheduleSummary)).toBeNull();
    });
    expect(
      renderResult.queryByText(strings('bridge.orders.empty.history')),
    ).toBeNull();
    expect(
      renderResult.getByText(strings('bridge.all_networks')),
    ).toBeOnTheScreen();
    expect(
      renderResult.getAllByText(strings('bridge.tabs.recurring')).length,
    ).toBeGreaterThan(0);
    expect(
      renderResult.getByText(strings('bridge.recurring.filled')),
    ).toBeOnTheScreen();
    expect(renderResult.getByText('+0.325 USDC')).toBeOnTheScreen();
    expect(renderResult.getAllByText(pair)).toHaveLength(1);
  });

  it('hides the footer confirm button after opening the tab without a quote', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);

    expect(
      renderResult.queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  describe('price range', () => {
    it('shows Not set without an avatar and opens the sheet after dismissing the keypad', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);

      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
      ).toHaveTextContent(strings('bridge.recurring.price_range.not_set'));
      expect(
        renderResult.queryByTestId(PriceRangeRowSelectorsIDs.AVATAR),
      ).not.toBeOnTheScreen();

      await openAmountKeypad(renderResult);
      await openPriceRangeSheet(renderResult);

      expect(
        renderResult.queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.EXCHANGE_RATE),
      ).toHaveTextContent(
        formatExchangeRate({
          selected: 'dest',
          sourceSymbol: 'ETH',
          destSymbol: 'mUSD',
          quoteRate: ETH_FIAT_RATE / MUSD_FIAT_RATE,
        }),
      );
    });

    it('discards pending min and max when the sheet is closed', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('min', -10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.CLOSE_BUTTON),
      );

      await waitFor(() => {
        expect(
          renderResult.queryByTestId(PriceRangeSheetSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen();
      });
      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
      ).toHaveTextContent(strings('bridge.recurring.price_range.not_set'));

      await openPriceRangeSheet(renderResult);

      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
      ).toHaveDisplayValue('');
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue('');
    });

    it('clears pending min and max without closing the sheet', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('min', -10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('max', 10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.CLEAR_ALL),
      );

      await waitFor(() => {
        expect(
          renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
        ).toHaveDisplayValue('');
      });
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue('');
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
      const confirmButton = renderResult.getByTestId(
        PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON,
      );
      expect(confirmButton).toBeOnTheScreen();
      expect(confirmButton.props.accessibilityState.disabled).toBe(false);
    });

    it('fills min and max from percent chips relative to the live price', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('min', -10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('max', 10),
        ),
      );

      await waitFor(() => {
        expect(
          renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
        ).toHaveDisplayValue(applyPercentToPrice(MUSD_FIAT_RATE, -10));
      });
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue(applyPercentToPrice(MUSD_FIAT_RATE, 10));
    });

    it('updates titles and clears fields when the token segment changes', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('min', -10),
        ),
      );
      await selectPriceRangeSourceToken(renderResult);

      expect(
        renderResult.getByText(
          strings('bridge.recurring.price_range.max_token_price', {
            symbol: 'ETH',
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
      ).toHaveDisplayValue('');
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue('');
    });

    it('keeps confirm enabled when min and max are empty', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);

      const confirmButton = renderResult.getByTestId(
        PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON,
      );
      expect(confirmButton.props.accessibilityState.disabled).toBe(false);
    });

    it('keeps confirm disabled when min is not less than max', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);

      await openPriceRangeKeypad(renderResult, 'min');
      typePriceRangeDigits(renderResult, '2000');
      await openPriceRangeKeypad(renderResult, 'max');
      typePriceRangeDigits(renderResult, '1000');

      await waitFor(() => {
        expect(
          renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
        ).toHaveDisplayValue('2000');
      });
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue('1000');
      const stillDisabledConfirm = renderResult.getByTestId(
        PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON,
      );
      expect(stillDisabledConfirm).toBeDisabled();
      expect(stillDisabledConfirm.props.accessibilityState.disabled).toBe(true);
    });

    it('keeps the max field on screen while the keypad is open', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      await openPriceRangeKeypad(renderResult, 'max');

      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toBeOnTheScreen();
      expect(
        renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('closes the keypad when the sheet is pressed outside it', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      await openPriceRangeKeypad(renderResult, 'max');
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.KEYPAD_DISMISS),
      );

      await waitFor(() => {
        expect(
          renderResult.queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
        ).not.toBeOnTheScreen();
      });
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });

    it('writes the confirmed range onto the row', async () => {
      const renderResult = renderRecurringPriceRangeView();
      const min = applyPercentToPrice(MUSD_FIAT_RATE, -10);
      const max = applyPercentToPrice(MUSD_FIAT_RATE, 10);

      await openRecurringTab(renderResult);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('min', -10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(
          PriceRangeSheetSelectorsIDs.PERCENT('max', 10),
        ),
      );
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON),
      );

      await waitFor(() => {
        expect(
          renderResult.queryByTestId(PriceRangeSheetSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen();
      });
      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
      ).toHaveTextContent(formatPriceRangeLabel(min, max, 'usd'));
      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.AVATAR),
      ).toBeOnTheScreen();
      expect(renderResult.store.getState().bridge.recurring.priceRange).toEqual(
        {
          tokenSide: 'dest',
          currency: 'usd',
          min,
          max,
        },
      );
    });

    it('clears the stored range when empty min and max are confirmed', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await seedPriceRangeAfterTokens(renderResult, STORED_USD_PRICE_RANGE);
      await openPriceRangeSheet(renderResult);
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.CLEAR_ALL),
      );
      fireEvent.press(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.CONFIRM_BUTTON),
      );

      await waitFor(() => {
        expect(
          renderResult.queryByTestId(PriceRangeSheetSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen();
      });
      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
      ).toHaveTextContent(strings('bridge.recurring.price_range.not_set'));
      expect(
        renderResult.queryByTestId(PriceRangeRowSelectorsIDs.AVATAR),
      ).not.toBeOnTheScreen();
      expect(
        renderResult.store.getState().bridge.recurring.priceRange,
      ).toBeUndefined();
    });

    it('treats a stored range as unset when the settings currency differs', async () => {
      const renderResult = renderRecurringPriceRangeView({
        currentCurrency: 'eur',
      });

      await openRecurringTab(renderResult);
      await seedPriceRangeAfterTokens(renderResult, STORED_USD_PRICE_RANGE);

      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
      ).toHaveTextContent(strings('bridge.recurring.price_range.not_set'));
      expect(
        renderResult.queryByTestId(PriceRangeRowSelectorsIDs.AVATAR),
      ).not.toBeOnTheScreen();
      expect(renderResult.store.getState().bridge.recurring.priceRange).toEqual(
        STORED_USD_PRICE_RANGE,
      );

      await openPriceRangeSheet(renderResult);

      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
      ).toHaveDisplayValue('');
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue('');
      expect(renderResult.store.getState().bridge.recurring.priceRange).toEqual(
        STORED_USD_PRICE_RANGE,
      );
    });

    it('shows the stored range when the settings currency matches', async () => {
      const renderResult = renderRecurringPriceRangeView();

      await openRecurringTab(renderResult);
      await seedPriceRangeAfterTokens(renderResult, STORED_USD_PRICE_RANGE);

      await waitFor(() => {
        expect(
          renderResult.getByTestId(PriceRangeRowSelectorsIDs.VALUE),
        ).toHaveTextContent(
          formatPriceRangeLabel(
            STORED_USD_PRICE_RANGE.min,
            STORED_USD_PRICE_RANGE.max,
            STORED_USD_PRICE_RANGE.currency,
          ),
        );
      });
      expect(
        renderResult.getByTestId(PriceRangeRowSelectorsIDs.AVATAR),
      ).toBeOnTheScreen();

      await openPriceRangeSheet(renderResult);

      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MIN_INPUT),
      ).toHaveDisplayValue(STORED_USD_PRICE_RANGE.min);
      expect(
        renderResult.getByTestId(PriceRangeSheetSelectorsIDs.MAX_INPUT),
      ).toHaveDisplayValue(STORED_USD_PRICE_RANGE.max);
    });
  });
});
