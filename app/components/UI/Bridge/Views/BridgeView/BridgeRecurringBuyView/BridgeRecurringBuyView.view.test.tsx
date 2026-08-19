import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../../locales/i18n';
import { renderBridgeView } from '../../../../../../../tests/component-view/renderers/bridge';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { RecurringScheduleFieldsSelectorsIDs } from '../../../components/RecurringScheduleFields';
import { RecurringIntervalSheetSelectorsIDs } from '../../../components/RecurringIntervalSheet';
import { OrdersTabsSelectorsIDs } from '../../../components/OrdersTabs';
import { BuildQuoteSelectors } from '../../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';

const errorColor = lightTheme.colors.error.default;

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
    expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();
    expect(renderResult.queryByText('Max')).not.toBeOnTheScreen();
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

  it('marks the every value invalid when it exceeds the unit max', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);
    await openEveryKeypad(renderResult);
    fireEvent.press(renderResult.getByTestId('keypad-key-5'));
    fireEvent.press(renderResult.getByTestId('keypad-key-5'));
    await waitFor(() => {
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('155');
    });

    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).not.toHaveStyle({ color: errorColor });
  });

  it('marks the repeat value invalid when it is 0', async () => {
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

    expect(
      renderResult.getByTestId(
        RecurringScheduleFieldsSelectorsIDs.REPEAT_INPUT,
      ),
    ).toHaveStyle({ color: errorColor });
    expect(
      renderResult.getByTestId(RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT),
    ).not.toHaveStyle({ color: errorColor });
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
    });

    it('reuses the same keypad for the every field, hiding the amount quick picks', async () => {
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
        expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();
      });
      expect(
        renderResult.getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();

      fireEvent.press(renderResult.getByTestId('keypad-key-2'));

      await waitFor(() => {
        expect(
          renderResult.getByTestId(
            RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
          ),
        ).toHaveDisplayValue('12');
      });
    });

    it('returns the keypad to the amount after the schedule was edited', async () => {
      const renderResult = renderBridgeView();

      await openRecurringTab(renderResult);
      await openEveryKeypad(renderResult);
      expect(renderResult.queryByText('25%')).not.toBeOnTheScreen();

      await openAmountKeypad(renderResult);

      expect(renderResult.getByText('25%')).toBeOnTheScreen();
      expect(
        renderResult.getByTestId(
          RecurringScheduleFieldsSelectorsIDs.EVERY_INPUT,
        ),
      ).toHaveDisplayValue('1');
    });
  });

  it('shows history empty copy after pressing the History tab', async () => {
    const renderResult = renderBridgeView();

    await openRecurringTab(renderResult);

    expect(
      renderResult.getByText(strings('bridge.orders.empty.open_orders')),
    ).toBeOnTheScreen();

    fireEvent.press(
      renderResult.getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB),
    );

    await waitFor(() => {
      expect(
        renderResult.getByText(strings('bridge.orders.empty.history')),
      ).toBeOnTheScreen();
    });
    expect(
      renderResult.queryByText(strings('bridge.orders.empty.open_orders')),
    ).toBeNull();
  });
});
