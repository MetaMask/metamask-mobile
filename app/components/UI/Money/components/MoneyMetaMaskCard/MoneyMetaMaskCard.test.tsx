import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyMetaMaskCard from './MoneyMetaMaskCard';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyMetaMaskCard', () => {
  it('renders the section title and subtitle', () => {
    const { getByText } = render(<MoneyMetaMaskCard />);

    expect(getByText(strings('money.metamask_card.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('money.metamask_card.subtitle')),
    ).toBeOnTheScreen();
  });

  it('renders virtual card row', () => {
    const { getByText, getByTestId } = render(<MoneyMetaMaskCard />);

    expect(
      getByText(strings('money.metamask_card.virtual_card')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.metamask_card.cashback', { percentage: '1' })),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
    ).toBeOnTheScreen();
  });

  it('renders metal card row', () => {
    const { getByText, getByTestId } = render(<MoneyMetaMaskCard />);

    expect(
      getByText(strings('money.metamask_card.metal_card')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.metamask_card.cashback', { percentage: '3' })),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
    ).toBeOnTheScreen();
  });

  it('calls onGetNowPress with "virtual" when virtual card Get now is pressed', () => {
    const mockGetNow = jest.fn();
    const { getAllByText } = render(
      <MoneyMetaMaskCard onGetNowPress={mockGetNow} />,
    );

    const getNowButtons = getAllByText(strings('money.metamask_card.get_now'));
    fireEvent.press(getNowButtons[0]);

    expect(mockGetNow).toHaveBeenCalledWith('virtual');
  });

  it('calls onGetNowPress with "metal" when metal card Get now is pressed', () => {
    const mockGetNow = jest.fn();
    const { getAllByText } = render(
      <MoneyMetaMaskCard onGetNowPress={mockGetNow} />,
    );

    const getNowButtons = getAllByText(strings('money.metamask_card.get_now'));
    fireEvent.press(getNowButtons[1]);

    expect(mockGetNow).toHaveBeenCalledWith('metal');
  });

  describe('link mode', () => {
    it('renders link subtitle instead of upsell subtitle', () => {
      const { getByText, queryByText } = render(
        <MoneyMetaMaskCard mode="link" />,
      );

      expect(
        getByText(strings('money.metamask_card.link_subtitle')),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('money.metamask_card.subtitle')),
      ).not.toBeOnTheScreen();
    });

    it('renders card image in link mode', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard mode="link" />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
      ).toBeOnTheScreen();
    });

    it('renders cashback and APY bullets', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard mode="link" apy={5} />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
      ).toBeOnTheScreen();
    });

    it('renders "Link card" button', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard mode="link" />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides virtual and metal card rows in link mode', () => {
      const { queryByTestId } = render(<MoneyMetaMaskCard mode="link" />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).not.toBeOnTheScreen();
    });

    it('calls onLinkPress when "Link card" button is pressed', () => {
      const mockLink = jest.fn();
      const { getByTestId } = render(
        <MoneyMetaMaskCard mode="link" onLinkPress={mockLink} />,
      );

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));
      expect(mockLink).toHaveBeenCalledTimes(1);
    });

    it('renders link-specific section title', () => {
      const { getByText } = render(<MoneyMetaMaskCard mode="link" />);

      expect(
        getByText(strings('money.metamask_card.link_title')),
      ).toBeOnTheScreen();
    });

    it('calls onHeaderPress when section header is tapped in link mode', () => {
      const mockHeader = jest.fn();
      const { getByText } = render(
        <MoneyMetaMaskCard mode="link" onHeaderPress={mockHeader} />,
      );

      fireEvent.press(getByText(strings('money.metamask_card.link_title')));
      expect(mockHeader).toHaveBeenCalled();
    });
  });

  describe('upsell mode (default)', () => {
    it('renders virtual and metal card rows', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('does not render link mode elements', () => {
      const { queryByTestId } = render(<MoneyMetaMaskCard />);

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
