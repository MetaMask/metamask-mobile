import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { getFormatters } from '#app/components/hooks/useFormatters';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import {
  mockMaxPackQuantity,
  mockPayToken,
} from '#app/components/UI/Collectibles/mocks/buySheet';
import { BuySheetView } from '#app/components/UI/Collectibles/views/BuySheetView';

const [pack] = mockHomePacks;
const { formatCurrency } = getFormatters();

describe('BuySheetView', () => {
  it('shows the pack name as the title', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
  });

  it('shows the price of one pack as the amount and total', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      screen.getAllByText(formatCurrency(pack.priceUsd, 'USD')),
    ).toHaveLength(2);
  });

  it('labels the button for one pack by default', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 1 }),
      ),
    ).toBeOnTheScreen();
  });

  it('multiplies the amount and total by the chosen quantity', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.pack_count', { count: 5 }),
      }),
    );

    expect(
      screen.getAllByText(formatCurrency(pack.priceUsd * 5, 'USD')),
    ).toHaveLength(2);
  });

  it('updates the button label with the chosen quantity', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.pack_count', { count: 10 }),
      }),
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 10 }),
      ),
    ).toBeOnTheScreen();
  });

  it('selects the max quantity from the max chip', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.max'),
      }),
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', {
          count: mockMaxPackQuantity,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('shows the pay token balance', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.pay_with_balance', {
          symbol: mockPayToken.symbol,
          balance: formatCurrency(mockPayToken.balanceUsd, 'USD'),
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('turns skip reveals on when switched', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent(
      screen.getByRole('switch', {
        name: strings('collectibles.buy_sheet.skip_reveals'),
      }),
      'valueChange',
      true,
    );

    expect(
      screen.getByRole('switch', {
        name: strings('collectibles.buy_sheet.skip_reveals'),
      }),
    ).toBeChecked();
  });

  it('updates the total when the slider moves', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent(
      screen.getByRole('adjustable', {
        name: strings('collectibles.buy_sheet.quantity'),
      }),
      'accessibilityAction',
      { nativeEvent: { actionName: 'increment' } },
    );

    expect(
      screen.getAllByText(formatCurrency(pack.priceUsd * 2, 'USD')),
    ).toHaveLength(2);
  });

  it('updates the button label when the slider moves', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent(
      screen.getByRole('adjustable', {
        name: strings('collectibles.buy_sheet.quantity'),
      }),
      'accessibilityAction',
      { nativeEvent: { actionName: 'increment' } },
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 2 }),
      ),
    ).toBeOnTheScreen();
  });

  it('moves the slider to the quantity of the pressed chip', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.pack_count', { count: 10 }),
      }),
    );

    expect(
      screen.getByRole('adjustable', {
        name: strings('collectibles.buy_sheet.quantity'),
      }),
    ).toHaveAccessibilityValue({ now: 10 });
  });

  it('selects the max chip at the cap', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.max'),
      }),
    );

    expect(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.max'),
      }),
    ).toBeSelected();
  });

  it('does not select the 10 packs chip at the cap', () => {
    render(
      <BuySheetView
        name={pack.name}
        priceUsd={pack.priceUsd}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.max'),
      }),
    );

    expect(
      screen.getByRole('button', {
        name: strings('collectibles.buy_sheet.pack_count', { count: 10 }),
      }),
    ).not.toBeSelected();
  });
});
