import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { getFormatters } from '#app/components/hooks/useFormatters';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import {
  mockMaxPackQuantity,
  mockPayToken,
} from '#app/components/UI/Collectibles/mocks/buySheet';
import { BuySheetView } from '#app/components/UI/Collectibles/views/BuySheetView';

jest.mock('#app/components/UI/Collectibles/hooks/useHomePacks', () => ({
  useHomePacks: () => ({ data: mockHomePacks }),
}));

const [pack] = mockHomePacks;
const { formatCurrency } = getFormatters();

describe('BuySheetView', () => {
  it('shows the price of one pack as the amount', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.buySheetAmount),
    ).toHaveTextContent(formatCurrency(pack.priceUsd, 'USD'));
  });

  it('labels the button for one pack by default', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 1 }),
      ),
    ).toBeOnTheScreen();
  });

  it('multiplies the amount and total by the chosen quantity', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.buySheetQuantity('5')),
    );

    const total = formatCurrency(pack.priceUsd * 5, 'USD');
    expect(
      screen.getByTestId(collectiblesTestIds.buySheetAmount),
    ).toHaveTextContent(total);
    expect(
      screen.getByTestId(collectiblesTestIds.buySheetTotal),
    ).toHaveTextContent(total);
  });

  it('updates the button label with the chosen quantity', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.buySheetQuantity('10')),
    );

    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 10 }),
      ),
    ).toBeOnTheScreen();
  });

  it('labels the max chip without a number', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.buySheetQuantity('max')),
    ).toHaveTextContent(strings('collectibles.buy_sheet.max'));
  });

  it('selects the max quantity from the max chip', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.buySheetQuantity('max')),
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
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

    expect(
      screen.getByTestId(collectiblesTestIds.buySheetPayWith),
    ).toHaveTextContent(
      strings('collectibles.buy_sheet.pay_with_balance', {
        symbol: mockPayToken.symbol,
        balance: formatCurrency(mockPayToken.balanceUsd, 'USD'),
      }),
      { exact: false },
    );
  });

  it('turns skip reveals on when switched', () => {
    render(<BuySheetView packCode={pack.code} onDismiss={jest.fn()} />);

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
});
