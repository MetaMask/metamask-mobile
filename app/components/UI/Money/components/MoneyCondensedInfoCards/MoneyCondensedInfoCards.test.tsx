import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyCondensedInfoCards from './MoneyCondensedInfoCards';
import { MoneyCondensedInfoCardsTestIds } from './MoneyCondensedInfoCards.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyCondensedInfoCards', () => {
  it('renders all three cards', () => {
    const { getByTestId } = render(<MoneyCondensedInfoCards />);

    expect(
      getByTestId(MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyCondensedInfoCardsTestIds.MUSD_CARD),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD),
    ).toBeOnTheScreen();
  });

  it('renders correct titles and subtitles', () => {
    const { getByText } = render(<MoneyCondensedInfoCards />);

    expect(
      getByText(strings('money.condensed_cards.how_it_works_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.how_it_works_subtitle')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.musd_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.musd_subtitle')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.what_you_get_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.what_you_get_subtitle')),
    ).toBeOnTheScreen();
  });

  it('calls onHowItWorksPress when How it works card is pressed', () => {
    const mock = jest.fn();
    const { getByTestId } = render(
      <MoneyCondensedInfoCards onHowItWorksPress={mock} />,
    );
    fireEvent.press(
      getByTestId(MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD),
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('calls onMusdPress when MetaMask USD card is pressed', () => {
    const mock = jest.fn();
    const { getByTestId } = render(
      <MoneyCondensedInfoCards onMusdPress={mock} />,
    );
    fireEvent.press(getByTestId(MoneyCondensedInfoCardsTestIds.MUSD_CARD));
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('calls onWhatYouGetPress when What you get card is pressed', () => {
    const mock = jest.fn();
    const { getByTestId } = render(
      <MoneyCondensedInfoCards onWhatYouGetPress={mock} />,
    );
    fireEvent.press(
      getByTestId(MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD),
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('does not throw when cards are pressed without handlers', () => {
    const { getByTestId } = render(<MoneyCondensedInfoCards />);
    expect(() => {
      fireEvent.press(
        getByTestId(MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD),
      );
      fireEvent.press(getByTestId(MoneyCondensedInfoCardsTestIds.MUSD_CARD));
      fireEvent.press(
        getByTestId(MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD),
      );
    }).not.toThrow();
  });
});
