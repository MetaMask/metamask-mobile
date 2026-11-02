import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsDefaultExchangeSheet from './PerpsDefaultExchangeSheet';
import { PerpsDefaultExchangeSheetSelectorsIDs } from './PerpsDefaultExchangeSheet.testIds';
import type { PerpsDefaultExchangeOption } from './PerpsDefaultExchangeSheet.types';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.default_exchange.title': 'Default exchange',
      'perps.default_exchange.description':
        'Set a default exchange for all orders. You can change it anytime in settings.',
      'perps.default_exchange.max_leverage': '{{leverage}}x max',
      'perps.default_exchange.fees': '{{maker}} maker / {{taker}} taker',
      'perps.default_exchange.open_interest': '{{amount}} open interest',
      'perps.default_exchange.save': 'Save',
      'navigation.close': 'Close',
    };
    const template = translations[key] ?? key;

    if (!params) {
      return template;
    }

    return Object.entries(params).reduce(
      (result, [name, value]) => result.replace(`{{${name}}}`, value),
      template,
    );
  }),
}));

const createOption = (
  overrides: Partial<PerpsDefaultExchangeOption> &
    Pick<PerpsDefaultExchangeOption, 'id' | 'name'>,
): PerpsDefaultExchangeOption => ({
  logoSource: { uri: overrides.id },
  maxLeverage: '50',
  makerFee: '0.103%',
  takerFee: '0.103%',
  openInterest: '$747.9M',
  ...overrides,
});

const lighterOption = createOption({
  id: 'lighter',
  name: 'Lighter',
  openInterest: '$747.9M',
});

const hyperliquidOption = createOption({
  id: 'hyperliquid',
  name: 'Hyperliquid',
  makerFee: '0.113%',
  takerFee: '0.143%',
  openInterest: '$7.48B',
});

describe('PerpsDefaultExchangeSheet', () => {
  const onClose = jest.fn();
  const onSave = jest.fn();

  const renderSheet = (
    overrides: Partial<
      React.ComponentProps<typeof PerpsDefaultExchangeSheet>
    > = {},
  ) =>
    render(
      <PerpsDefaultExchangeSheet
        isVisible
        options={[lighterOption, hyperliquidOption]}
        selectedOptionId="hyperliquid"
        onClose={onClose}
        onSave={onSave}
        {...overrides}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when isVisible is false', () => {
    const { toJSON } = renderSheet({ isVisible: false });

    expect(toJSON()).toBeNull();
  });

  it('renders the title, description, and both exchange cards', () => {
    renderSheet();

    expect(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('Default exchange');
    expect(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(
      'Set a default exchange for all orders. You can change it anytime in settings.',
    );
    expect(screen.getByText('Lighter')).toBeOnTheScreen();
    expect(screen.getByText('Hyperliquid')).toBeOnTheScreen();
    expect(screen.getAllByText('50x max')).toHaveLength(2);
    expect(screen.getByText('0.103% maker / 0.103% taker')).toBeOnTheScreen();
    expect(screen.getByText('$747.9M open interest')).toBeOnTheScreen();
    expect(screen.getByText('0.113% maker / 0.143% taker')).toBeOnTheScreen();
    expect(screen.getByText('$7.48B open interest')).toBeOnTheScreen();
  });

  it('marks the saved exchange as selected', () => {
    renderSheet();

    expect(
      screen.getByTestId(
        `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-hyperliquid`,
      ).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      screen.getByTestId(
        `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-lighter`,
      ).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });

  it('keeps a new choice in draft until Save', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(
        `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-lighter`,
      ),
    );

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(
        `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-lighter`,
      ).props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('calls onSave with the drafted exchange when Save is pressed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(
        `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-lighter`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.SAVE),
    );

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('lighter');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave with the saved exchange when Save is pressed without a new choice', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.SAVE),
    );

    expect(onSave).toHaveBeenCalledWith('hyperliquid');
  });

  it('calls onClose when the close button is pressed', () => {
    renderSheet();

    fireEvent.press(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.CLOSE),
    );

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
