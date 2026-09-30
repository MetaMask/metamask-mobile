import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaPackCardTestIds } from '../../Gacha.testIds';
import { createPack } from '../../views/testUtils';
import PackCard from './PackCard';

const PACK = createPack();

describe('PackCard', () => {
  it('renders the pack details and the Open CTA with its price', () => {
    renderWithProvider(
      <PackCard pack={PACK} isAffordable onOpen={jest.fn()} />,
    );

    expect(screen.getByText('Elite Pokemon Pack')).toBeOnTheScreen();
    expect(screen.getByText('Pokemon')).toBeOnTheScreen();
    expect(screen.getByText('85% instant buyback')).toBeOnTheScreen();
    expect(screen.getByText('Cards up to $1,500')).toBeOnTheScreen();
    expect(
      screen.getByText('Common 80% · Uncommon 15% · Rare 4% · Epic 1%'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Open · 50')).toBeOnTheScreen();
  });

  it('calls onOpen with the pack when affordable', () => {
    const onOpen = jest.fn();
    renderWithProvider(<PackCard pack={PACK} isAffordable onOpen={onOpen} />);

    fireEvent.press(
      screen.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(PACK.code)),
    );

    expect(onOpen).toHaveBeenCalledWith(PACK);
    expect(
      screen.queryByTestId(GachaPackCardTestIds.INSUFFICIENT(PACK.code)),
    ).not.toBeOnTheScreen();
  });

  it('disables the CTA and explains why when the balance is too low', () => {
    const onOpen = jest.fn();
    renderWithProvider(
      <PackCard pack={PACK} isAffordable={false} onOpen={onOpen} />,
    );
    const button = screen.getByTestId(
      GachaPackCardTestIds.OPEN_BUTTON(PACK.code),
    );

    fireEvent.press(button);

    expect(button).toBeDisabled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(GachaPackCardTestIds.INSUFFICIENT(PACK.code)),
    ).toHaveTextContent('Not enough USDC');
  });

  it('omits the optional lines when the data is missing', () => {
    renderWithProvider(
      <PackCard
        pack={createPack({
          category: null,
          instantBuybackPercent: 0,
          maxValue: 0,
          odds: { common: 0, uncommon: 0, rare: 0, epic: 0 },
        })}
        isAffordable
        onOpen={jest.fn()}
      />,
    );

    expect(screen.queryByText('Pokemon')).not.toBeOnTheScreen();
    expect(screen.queryByText(/instant buyback/u)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Cards up to/u)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Common/u)).not.toBeOnTheScreen();
  });
});
