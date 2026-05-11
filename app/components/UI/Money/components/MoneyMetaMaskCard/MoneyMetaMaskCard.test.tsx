import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyMetaMaskCard from './MoneyMetaMaskCard';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import { strings } from '../../../../../../locales/i18n';

describe('MoneyMetaMaskCard', () => {
  it('renders the section title and subtitle', () => {
    const { getByText } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} />,
    );

    expect(getByText(strings('money.metamask_card.title'))).toBeOnTheScreen();
    expect(
      getByText(strings('money.metamask_card.subtitle')),
    ).toBeOnTheScreen();
  });

  it('renders virtual card row', () => {
    const { getByText, getByTestId } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} />,
    );

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

  it('renders metal card row when showMetalCard is true', () => {
    const { getByText, getByTestId } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard />,
    );

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

  it('hides metal card row by default (showMetalCard not provided)', () => {
    const { queryByTestId, queryByText } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} />,
    );

    expect(
      queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('money.metamask_card.metal_card')),
    ).not.toBeOnTheScreen();
  });

  it('hides metal card row when showMetalCard is false', () => {
    const { queryByTestId } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard={false} />,
    );

    expect(
      queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
    ).not.toBeOnTheScreen();
  });

  it('calls onGetNowPress when virtual card Get now is pressed', () => {
    const mockGetNow = jest.fn();
    const { getByText } = render(
      <MoneyMetaMaskCard onGetNowPress={mockGetNow} />,
    );

    fireEvent.press(getByText(strings('money.metamask_card.get_now')));

    expect(mockGetNow).toHaveBeenCalledTimes(1);
    expect(mockGetNow.mock.calls[0]).toEqual([]);
  });

  it('calls onGetNowPress when metal card Get now is pressed', () => {
    const mockGetNow = jest.fn();
    const { getAllByText } = render(
      <MoneyMetaMaskCard onGetNowPress={mockGetNow} showMetalCard />,
    );
    const getNowButtons = getAllByText(strings('money.metamask_card.get_now'));

    fireEvent.press(getNowButtons[1]);

    expect(mockGetNow).toHaveBeenCalledTimes(1);
    expect(mockGetNow.mock.calls[0]).toEqual([]);
  });

  describe('link mode', () => {
    it('renders link subtitle instead of upsell subtitle', () => {
      const { getByText, queryByText } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
      );

      expect(
        getByText(strings('money.metamask_card.link_subtitle')),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('money.metamask_card.subtitle')),
      ).not.toBeOnTheScreen();
    });

    it('renders card image in link mode', () => {
      const { getByTestId } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
      ).toBeOnTheScreen();
    });

    it('renders cashback and APY bullets', () => {
      const { getByTestId, getByText } = render(
        <MoneyMetaMaskCard mode="link" apy={4} onGetNowPress={jest.fn()} />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
      ).toBeOnTheScreen();
      expect(getByText('Get 1% mUSD back')).toBeOnTheScreen();
      expect(getByText('Earn up to 4% APY')).toBeOnTheScreen();
    });

    it('renders "Link card" button', () => {
      const { getByTestId } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('hides virtual and metal card rows in link mode', () => {
      const { queryByTestId } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
      );

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
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          onLinkPress={mockLink}
        />,
      );

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));
      expect(mockLink).toHaveBeenCalledTimes(1);
    });

    it('renders link-specific section title', () => {
      const { getByText } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
      );

      expect(
        getByText(strings('money.metamask_card.link_title')),
      ).toBeOnTheScreen();
    });

    it('calls onHeaderPress when section header is tapped in link mode', () => {
      const mockHeader = jest.fn();
      const { getByText } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          onHeaderPress={mockHeader}
        />,
      );

      fireEvent.press(getByText(strings('money.metamask_card.link_title')));
      expect(mockHeader).toHaveBeenCalled();
    });
  });

  describe('mode="manage"', () => {
    const props = {
      mode: 'manage' as const,
      onGetNowPress: jest.fn(),
      onManagePress: jest.fn(),
      cardBalance: '$2,342.86',
      apy: 4,
    };

    beforeEach(() => {
      props.onGetNowPress.mockClear();
      props.onManagePress.mockClear();
    });

    it('renders both balance and metal rows', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_METAL_ROW),
      ).toBeOnTheScreen();
    });

    it('renders the available balance', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$2,342.86');
    });

    it('calls onManagePress when Manage is tapped', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BUTTON));
      expect(props.onManagePress).toHaveBeenCalled();
    });

    it('calls onGetNowPress when metal Get now is tapped', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      fireEvent.press(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_METAL_GET_NOW),
      );
      expect(props.onGetNowPress).toHaveBeenCalled();
    });

    it('does not render upsell or link content', () => {
      const { queryByTestId } = render(<MoneyMetaMaskCard {...props} />);
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeNull();
      expect(queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER)).toBeNull();
    });
  });

  describe('upsell mode (default)', () => {
    it('renders virtual and metal card rows when showMetalCard is true', () => {
      const { getByTestId } = render(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).toBeOnTheScreen();
    });

    it('renders only the virtual card row when showMetalCard is false', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard={false} />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).not.toBeOnTheScreen();
    });

    it('does not render link mode elements', () => {
      const { queryByTestId } = render(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} />,
      );

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
