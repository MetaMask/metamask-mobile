import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import PerpsExchangeFilterSheet, {
  PerpsExchangeFilterSheetSelectorsIDs,
  type PerpsExchangeFilterSheetProps,
} from './PerpsExchangeFilterSheet';
import { PerpsProviderLogosSelectorsIDs } from '../../Perps.testIds';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'navigation.close': 'Close',
      'perps.selection_sheet.save': 'Save',
      'perps.exchange_filter.title': 'Filter by exchange',
      'perps.exchange_filter.tagline_lighter': 'Low fee, high leverage',
      'perps.exchange_filter.tagline_hyperliquid': 'High volume, low slippage',
    };
    return translations[key] || key;
  }),
}));

const OPTION_PREFIX = PerpsExchangeFilterSheetSelectorsIDs.OPTION;
const LIGHTER = `${OPTION_PREFIX}-lighter`;
const HYPERLIQUID = `${OPTION_PREFIX}-hyperliquid`;
const SAVE = PerpsExchangeFilterSheetSelectorsIDs.SAVE_BUTTON;
const CLOSE = PerpsExchangeFilterSheetSelectorsIDs.CLOSE_BUTTON;

describe('PerpsExchangeFilterSheet', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  const renderSheet = (
    overrides: Partial<PerpsExchangeFilterSheetProps> = {},
  ): ReturnType<typeof render> =>
    render(
      <PerpsExchangeFilterSheet
        selectedProviderIds={['lighter', 'hyperliquid']}
        onSave={mockOnSave}
        onClose={mockOnClose}
        {...overrides}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and both exchanges, Lighter first, never aggregated', () => {
    renderSheet();

    expect(screen.getByText('Filter by exchange')).toBeOnTheScreen();
    expect(screen.getByText('Lighter')).toBeOnTheScreen();
    expect(screen.getByText('HyperLiquid')).toBeOnTheScreen();
    expect(screen.queryByText('All Providers')).toBeNull();

    const container = screen.getByTestId(
      PerpsExchangeFilterSheetSelectorsIDs.CONTAINER,
    );
    const rows = within(container).getAllByRole('checkbox', {
      // Each row is a checkbox; its inner Checkbox control is also focusable,
      // so select the rows by their accessibility label.
      name: /Lighter|HyperLiquid/,
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProp('testID', LIGHTER);
    expect(rows[1]).toHaveProp('testID', HYPERLIQUID);
  });

  it('renders the exchange logo and tagline for each exchange', () => {
    renderSheet();

    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.LIGHTER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsProviderLogosSelectorsIDs.HYPERLIQUID),
    ).toBeOnTheScreen();
    expect(screen.getByText('Low fee, high leverage')).toBeOnTheScreen();
    expect(screen.getByText('High volume, low slippage')).toBeOnTheScreen();
  });

  it('opens with both exchanges checked and Save enabled', () => {
    renderSheet();

    expect(screen.getByTestId(LIGHTER)).toBeChecked();
    expect(screen.getByTestId(HYPERLIQUID)).toBeChecked();
    expect(screen.getByTestId(SAVE)).toBeEnabled();
  });

  it('checks only the initially selected exchange', () => {
    renderSheet({ selectedProviderIds: ['lighter'] });

    expect(screen.getByTestId(LIGHTER)).toBeChecked();
    expect(screen.getByTestId(HYPERLIQUID)).not.toBeChecked();
    expect(screen.getByTestId(SAVE)).toBeEnabled();
  });

  it('disables Save when nothing is checked and pressing it does not call onSave', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));
    fireEvent.press(screen.getByTestId(HYPERLIQUID));

    expect(screen.getByTestId(LIGHTER)).not.toBeChecked();
    expect(screen.getByTestId(HYPERLIQUID)).not.toBeChecked();
    expect(screen.getByTestId(SAVE)).toBeDisabled();

    fireEvent.press(screen.getByTestId(SAVE));
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('keeps the change local until Save is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the new selection in display order, then onClose once', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));
    fireEvent.press(screen.getByTestId(SAVE));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(['hyperliquid']);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with both ids in display order when both are checked', () => {
    renderSheet({ selectedProviderIds: ['hyperliquid'] });

    fireEvent.press(screen.getByTestId(LIGHTER));
    fireEvent.press(screen.getByTestId(SAVE));

    expect(mockOnSave).toHaveBeenCalledWith(['lighter', 'hyperliquid']);
  });

  it('discards the change and calls onClose once when the X is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));
    fireEvent.press(screen.getByTestId(CLOSE));

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('announces each row name and checked state, updating on toggle', () => {
    renderSheet({ selectedProviderIds: ['lighter'] });

    const lighter = screen.getByTestId(LIGHTER);
    expect(lighter).toHaveProp('accessibilityRole', 'checkbox');
    expect(lighter).toHaveProp('accessibilityLabel', 'Lighter');
    expect(lighter).toHaveProp('accessibilityState', { checked: true });
    expect(screen.getByTestId(HYPERLIQUID)).toHaveProp('accessibilityState', {
      checked: false,
    });

    fireEvent.press(lighter);

    expect(screen.getByTestId(LIGHTER)).toHaveProp('accessibilityState', {
      checked: false,
    });
  });

  it('resets the draft to the incoming selection when remounted', () => {
    const { unmount } = renderSheet();

    // Change the draft, then dismiss and remount with a different selection.
    fireEvent.press(screen.getByTestId(LIGHTER));
    unmount();
    renderSheet({ selectedProviderIds: ['hyperliquid'] });

    expect(screen.getByTestId(LIGHTER)).not.toBeChecked();
    expect(screen.getByTestId(HYPERLIQUID)).toBeChecked();
  });
});
