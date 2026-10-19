import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import MoneyCondensedInfoCards from './MoneyCondensedInfoCards';
import { MoneyCondensedInfoCardsTestIds } from './MoneyCondensedInfoCards.testIds';
import { strings } from '../../../../../../locales/i18n';
import howItWorksImageSource from '../../../../../images/mm_how_it_works.png';
import musdCoinImageSource from '../../../../../images/mm_usd.png';
import whatYouGetImageSource from '../../../../../images/mm_what_you_get.png';

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

  it('renders card artwork via expo-image with expected sources and styles', () => {
    const { getByTestId } = render(<MoneyCondensedInfoCards />);

    const howItWorksImage = getByTestId(
      MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_IMAGE,
    );
    expect(howItWorksImage.props.source).toBe(howItWorksImageSource);
    expect(howItWorksImage.props.style).toEqual({ height: 58, width: 58 });

    const musdImage = getByTestId(MoneyCondensedInfoCardsTestIds.MUSD_IMAGE);
    expect(musdImage.props.source).toBe(musdCoinImageSource);
    expect(musdImage.props.style).toEqual({ height: 48, width: 48 });

    const whatYouGetImage = getByTestId(
      MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_IMAGE,
    );
    expect(whatYouGetImage.props.source).toBe(whatYouGetImageSource);
    expect(whatYouGetImage.props.style).toEqual({ height: 66, width: 66 });
  });

  it('renders correct titles', () => {
    const { getByText } = render(<MoneyCondensedInfoCards />);

    expect(
      getByText(strings('money.condensed_cards.how_it_works_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.musd_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.condensed_cards.what_you_get_title')),
    ).toBeOnTheScreen();
  });

  it('renders each card as a single title line with no subtitle', () => {
    const { getByTestId } = render(<MoneyCondensedInfoCards />);

    [
      MoneyCondensedInfoCardsTestIds.HOW_IT_WORKS_CARD,
      MoneyCondensedInfoCardsTestIds.MUSD_CARD,
      MoneyCondensedInfoCardsTestIds.WHAT_YOU_GET_CARD,
    ].forEach((testID) => {
      expect(within(getByTestId(testID)).getAllByRole('text')).toHaveLength(1);
    });
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
