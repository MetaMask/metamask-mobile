import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PerpsMarketData,
  PerpsProviderType,
} from '@metamask/perps-controller';

import { PerpsTradeOnSelectorsIDs } from '../../Perps.testIds';
import PerpsTradeOnSheet from './PerpsTradeOnSheet';
import PerpsTradeOnRow from './PerpsTradeOnRow';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'navigation.close': 'Close',
      'perps.trade_on.title': 'Trade on',
      'perps.trade_on.subtitle':
        'Select an exchange for this order. To set a default for all orders, go to settings.',
      'perps.trade_on.max_leverage': 'max',
      'perps.trade_on.default_tag': 'Default',
      'perps.exchange_filter.tagline_lighter': 'Lower fee, higher leverage',
      'perps.exchange_filter.tagline_hyperliquid':
        'Higher volume, lower slippage',
      'perps.selection_sheet.save': 'Save',
    };
    if (params && key === 'perps.trade_on.accessibility_label') {
      return `Trade on ${String(params.venue)}`;
    }
    return translations[key] || key;
  }),
}));

const OPTION_PREFIX: string = PerpsTradeOnSelectorsIDs.SHEET_OPTION;
const HYPERLIQUID = `${OPTION_PREFIX}-hyperliquid`;
const LIGHTER = `${OPTION_PREFIX}-lighter`;
const SAVE = `${String(PerpsTradeOnSelectorsIDs.SHEET)}-save`;

const venue = (
  providerId: PerpsProviderType,
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol: 'ETH',
  name: 'Ethereum',
  providerId,
  maxLeverage: '50x',
  price: '$2,406',
  change24h: '+1%',
  change24hPercent: '+1%',
  volume: '$1B',
  ...overrides,
});

describe('PerpsTradeOnSheet', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  const renderSheet = (
    overrides: Partial<React.ComponentProps<typeof PerpsTradeOnSheet>> = {},
  ): ReturnType<typeof render> =>
    render(
      <PerpsTradeOnSheet
        selectedProviderId="hyperliquid"
        defaultProviderId="hyperliquid"
        venues={[venue('hyperliquid'), venue('lighter')]}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
        {...overrides}
      />,
    );

  it('renders one row per venue with its mark, tagline, and tags', () => {
    renderSheet();

    // The venue marks are decorative (the row's radio announces the venue
    // name), so they are hidden from the accessibility tree and only
    // reachable with hidden elements included.
    expect(
      screen.getByTestId(`${HYPERLIQUID}-logo`, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${LIGHTER}-logo`, { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    // Max-leverage tag on each row; the Default tag only on the default venue.
    expect(screen.getByTestId(`${HYPERLIQUID}-leverage-tag`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${LIGHTER}-leverage-tag`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${HYPERLIQUID}-default-tag`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`${LIGHTER}-default-tag`)).toBeNull();
    expect(screen.getByText('Higher volume, lower slippage')).toBeOnTheScreen();
    expect(screen.getByText('Lower fee, higher leverage')).toBeOnTheScreen();
  });

  it('marks the selected venue radio and not the others', () => {
    renderSheet();

    expect(screen.getByTestId(HYPERLIQUID)).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(screen.getByTestId(LIGHTER)).toHaveProp('accessibilityState', {
      selected: false,
    });
  });

  it('disables Save until the selection changes', () => {
    renderSheet();

    expect(screen.getByTestId(SAVE)).toBeDisabled();

    fireEvent.press(screen.getByTestId(LIGHTER));

    expect(screen.getByTestId(SAVE)).not.toBeDisabled();
  });

  it('drafts a radio tap without applying it', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));

    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('applies the drafted venue on Save', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(LIGHTER));
    fireEvent.press(screen.getByTestId(SAVE));

    expect(mockOnSelect).toHaveBeenCalledWith('lighter');
  });
});

describe('PerpsTradeOnRow', () => {
  const baseProps: React.ComponentProps<typeof PerpsTradeOnRow> = {
    providerId: 'lighter',
    onPress: jest.fn(),
  };

  it('renders the label and the venue name in the pill', () => {
    render(<PerpsTradeOnRow {...baseProps} />);

    // The row is one accessible button whose label composes both parts.
    expect(screen.getByLabelText('Trade on Lighter')).toBeOnTheScreen();
  });

  it('fires the press handler', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PerpsTradeOnRow
        {...baseProps}
        onPress={onPress}
        testID="trade-on-row"
      />,
    );

    fireEvent.press(getByTestId('trade-on-row'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
