import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyMetaMaskCard from './MoneyMetaMaskCard';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardFlow,
  CardScreens,
} from '../../../Card/util/metrics';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn((_eventName?: unknown) => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('MoneyMetaMaskCard', () => {
  const analyticsProps = {
    analyticsScreen: CardScreens.MONEY_HOME,
    analyticsEntryPoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
    analyticsFlow: CardFlow.MONEY_ACCOUNT_LINKAGE,
    analyticsCardState: 'unlinked_card',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section title and subtitle', () => {
    const { getByText } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} />,
    );

    expect(
      getByText(strings('money.metamask_card.upsell_title')),
    ).toBeOnTheScreen();
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

  it('hides metal card upsell row in upsell mode even when showMetalCard is true', () => {
    const { queryByTestId, getByTestId } = render(
      <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard />,
    );

    expect(
      queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
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

  describe('link mode', () => {
    it('renders link subtitle instead of upsell subtitle', () => {
      const { getByText, queryByText } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} apy={4} />,
      );

      expect(
        getByText(strings('money.metamask_card.link_subtitle', { apy: 4 })),
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

    it('renders 1% cashback and APY bullets for non-metal regions', () => {
      const { getByTestId, getByText, queryByText } = render(
        <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} apy={4} />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
      ).toBeOnTheScreen();
      expect(getByText('Get 1% mUSD back')).toBeOnTheScreen();
      expect(getByText('Earn up to ~4% APY')).toBeOnTheScreen();
      expect(queryByText('Get 3% mUSD back')).not.toBeOnTheScreen();
    });

    it('renders 3% cashback and APY bullets when showMetalCard is true', () => {
      const { getByTestId, getByText, queryByText } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          showMetalCard
          apy={4}
        />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
      ).toBeOnTheScreen();
      expect(getByText('Get 3% mUSD back')).toBeOnTheScreen();
      expect(getByText('Earn up to ~4% APY')).toBeOnTheScreen();
      expect(queryByText('Get 1% mUSD back')).not.toBeOnTheScreen();
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

    it('disables the link button when isLinkDisabled is true', () => {
      const mockLink = jest.fn();
      const { getByTestId } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          onLinkPress={mockLink}
          isLinkDisabled
        />,
      );

      const button = getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON);
      fireEvent.press(button);
      expect(mockLink).not.toHaveBeenCalled();
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('does not render a tappable header when isLinkDisabled is true', () => {
      const mockHeader = jest.fn();
      const { queryByTestId } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          onHeaderPress={mockHeader}
          isLinkDisabled
        />,
      );

      expect(
        queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
      ).not.toBeOnTheScreen();
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

    describe('hideCardImage', () => {
      it('does not render the card image when hideCardImage is true', () => {
        const { queryByTestId } = render(
          <MoneyMetaMaskCard
            mode="link"
            onGetNowPress={jest.fn()}
            apy={4}
            hideCardImage
          />,
        );

        expect(
          queryByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
        ).not.toBeOnTheScreen();
      });

      it('still renders cashback / APY bullets and the Link card button when hideCardImage is true', () => {
        const { getByTestId, getByText } = render(
          <MoneyMetaMaskCard
            mode="link"
            onGetNowPress={jest.fn()}
            apy={4}
            hideCardImage
          />,
        );

        expect(
          getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
        ).toBeOnTheScreen();
        expect(
          getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
        ).toBeOnTheScreen();
        expect(getByText('Get 1% mUSD back')).toBeOnTheScreen();
        expect(getByText('Earn up to ~4% APY')).toBeOnTheScreen();
        expect(
          getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON),
        ).toBeOnTheScreen();
      });
    });

    describe('apy undefined (no-APY copy)', () => {
      it('renders link_subtitle_no_apy when apy is undefined', () => {
        const { getByText } = render(
          <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
        );

        expect(
          getByText(strings('money.metamask_card.link_subtitle_no_apy')),
        ).toBeOnTheScreen();
        // link_subtitle and link_subtitle_no_apy share the same copy, so no
        // absence check is needed here.
      });

      it('omits the APY bullet when apy is undefined', () => {
        const { queryByTestId, getByTestId } = render(
          <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} />,
        );

        expect(
          queryByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
        ).not.toBeOnTheScreen();
        expect(
          getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
        ).toBeOnTheScreen();
      });

      it('combines hideCardImage and apy undefined into the Card Home variant', () => {
        const { getByText, queryByTestId } = render(
          <MoneyMetaMaskCard
            mode="link"
            onGetNowPress={jest.fn()}
            hideCardImage
          />,
        );

        expect(
          queryByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
        ).not.toBeOnTheScreen();
        expect(
          getByText(strings('money.metamask_card.link_subtitle_no_apy')),
        ).toBeOnTheScreen();
        expect(getByText('Get 1% mUSD back')).toBeOnTheScreen();
      });
    });
  });

  describe('mode="manage"', () => {
    const props = {
      mode: 'manage' as const,
      onGetNowPress: jest.fn(),
      onManagePress: jest.fn(),
      cardBalance: '$2,342.86',
    };

    beforeEach(() => {
      props.onGetNowPress.mockClear();
      props.onManagePress.mockClear();
    });

    it('renders only the balance row', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyMetaMaskCard {...props} />,
      );
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE_ROW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.MANAGE_METAL_ROW),
      ).not.toBeOnTheScreen();
    });

    it('renders 3% cashback when showMetalCard is true', () => {
      const { getByText } = render(
        <MoneyMetaMaskCard {...props} showMetalCard />,
      );

      expect(
        getByText(strings('money.metamask_card.cashback', { percentage: '3' })),
      ).toBeOnTheScreen();
    });

    it('renders 1% cashback when showMetalCard is false', () => {
      const { getByText } = render(
        <MoneyMetaMaskCard {...props} showMetalCard={false} />,
      );

      expect(
        getByText(strings('money.metamask_card.cashback', { percentage: '1' })),
      ).toBeOnTheScreen();
    });

    it('renders the available balance', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$2,342.86');
    });

    it('renders the available balance muted when the balance is stale', () => {
      const { getByTestId, rerender } = render(
        <MoneyMetaMaskCard {...props} />,
      );
      const balanceColor = () =>
        StyleSheet.flatten(
          getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE).props.style,
        ).color;
      const defaultColor = balanceColor();

      rerender(<MoneyMetaMaskCard {...props} isBalanceStale />);

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
      ).toHaveTextContent('$2,342.86');
      expect(balanceColor()).toBeDefined();
      expect(balanceColor()).not.toBe(defaultColor);
    });

    it('calls onManagePress when Manage is tapped', () => {
      const { getByTestId } = render(<MoneyMetaMaskCard {...props} />);
      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BUTTON));
      expect(props.onManagePress).toHaveBeenCalled();
    });

    it('does not render upsell or link content', () => {
      const { queryByTestId } = render(<MoneyMetaMaskCard {...props} />);
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeNull();
      expect(queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER)).toBeNull();
    });
  });

  describe('mode="verifying"', () => {
    it('renders the MetaMask Card title and verification pending banner', () => {
      const { getByText, getByTestId } = render(
        <MoneyMetaMaskCard mode="verifying" onGetNowPress={jest.fn()} />,
      );

      expect(getByText(strings('money.metamask_card.title'))).toBeOnTheScreen();
      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VERIFYING_BANNER),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.metamask_card.verification_pending')),
      ).toBeOnTheScreen();
    });

    it('calls onHeaderPress when section header is tapped in verifying mode', () => {
      const mockHeader = jest.fn();
      const { getByText } = render(
        <MoneyMetaMaskCard
          mode="verifying"
          onGetNowPress={jest.fn()}
          onHeaderPress={mockHeader}
        />,
      );

      fireEvent.press(getByText(strings('money.metamask_card.title')));
      expect(mockHeader).toHaveBeenCalled();
    });

    it('does not render upsell or link content', () => {
      const { queryByTestId } = render(
        <MoneyMetaMaskCard mode="verifying" onGetNowPress={jest.fn()} />,
      );

      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('upsell mode (default)', () => {
    it('renders only the virtual card row regardless of showMetalCard', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard />,
      );

      expect(
        getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.METAL_CARD_ROW),
      ).not.toBeOnTheScreen();
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

  describe('analytics', () => {
    it('does not track when analytics props are omitted', () => {
      render(<MoneyMetaMaskCard onGetNowPress={jest.fn()} />);

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks Card Viewed once when analytics props are provided', () => {
      const { rerender } = render(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} {...analyticsProps} />,
      );

      rerender(
        <MoneyMetaMaskCard onGetNowPress={jest.fn()} {...analyticsProps} />,
      );

      expect(
        mockCreateEventBuilder.mock.calls.filter(
          ([eventName]) => eventName === MetaMetricsEvents.CARD_VIEWED,
        ),
      ).toHaveLength(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'upsell',
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'unlinked_card',
        action: undefined,
      });
    });

    it('defers Card Viewed while analyticsReady is false', () => {
      render(
        <MoneyMetaMaskCard
          onGetNowPress={jest.fn()}
          {...analyticsProps}
          analyticsReady={false}
        />,
      );

      expect(
        mockCreateEventBuilder.mock.calls.filter(
          ([eventName]) => eventName === MetaMetricsEvents.CARD_VIEWED,
        ),
      ).toHaveLength(0);
    });

    it('tracks Card Viewed with settled properties once analyticsReady flips to true', () => {
      const { rerender } = render(
        <MoneyMetaMaskCard
          mode="upsell"
          onGetNowPress={jest.fn()}
          {...analyticsProps}
          analyticsCardState="non_cardholder"
          analyticsReady={false}
        />,
      );

      // Async cardholder/auth data settles: mode + card_state change and the
      // gate opens. Only the post-load values should be recorded.
      rerender(
        <MoneyMetaMaskCard
          mode="manage"
          onGetNowPress={jest.fn()}
          {...analyticsProps}
          analyticsCardState="linked_card"
          analyticsReady
        />,
      );

      const cardViewedCalls = mockCreateEventBuilder.mock.calls.filter(
        ([eventName]) => eventName === MetaMetricsEvents.CARD_VIEWED,
      );
      expect(cardViewedCalls).toHaveLength(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'manage',
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'linked_card',
        action: undefined,
      });
    });

    it('tracks Card Viewed only once even if properties keep changing after the gate opens', () => {
      const { rerender } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          {...analyticsProps}
          analyticsReady
        />,
      );

      rerender(
        <MoneyMetaMaskCard
          mode="manage"
          onGetNowPress={jest.fn()}
          {...analyticsProps}
          analyticsReady
        />,
      );

      expect(
        mockCreateEventBuilder.mock.calls.filter(
          ([eventName]) => eventName === MetaMetricsEvents.CARD_VIEWED,
        ),
      ).toHaveLength(1);
    });

    it('tracks Get now clicks before calling the handler', () => {
      const mockGetNow = jest.fn();
      const { getByText } = render(
        <MoneyMetaMaskCard onGetNowPress={mockGetNow} {...analyticsProps} />,
      );
      jest.clearAllMocks();

      fireEvent.press(getByText(strings('money.metamask_card.get_now')));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'upsell',
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'unlinked_card',
        action: CardActions.MONEY_ACCOUNT_METAMASK_CARD_GET_NOW_BUTTON,
      });
      expect(mockGetNow).toHaveBeenCalledTimes(1);
    });

    it('tracks Link card clicks before calling the handler', () => {
      const mockLink = jest.fn();
      const { getByTestId } = render(
        <MoneyMetaMaskCard
          mode="link"
          onGetNowPress={jest.fn()}
          onLinkPress={mockLink}
          {...analyticsProps}
        />,
      );
      jest.clearAllMocks();

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.LINK_BUTTON));

      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'link',
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'unlinked_card',
        action: CardActions.MONEY_ACCOUNT_METAMASK_CARD_LINK_BUTTON,
      });
      expect(mockLink).toHaveBeenCalledTimes(1);
    });

    it('tracks Manage clicks before calling the handler', () => {
      const mockManage = jest.fn();
      const { getByTestId } = render(
        <MoneyMetaMaskCard
          mode="manage"
          onGetNowPress={jest.fn()}
          onManagePress={mockManage}
          cardBalance="$0.00"
          {...analyticsProps}
        />,
      );
      jest.clearAllMocks();

      fireEvent.press(getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BUTTON));

      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode: 'manage',
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'unlinked_card',
        action: CardActions.MONEY_ACCOUNT_METAMASK_CARD_MANAGE_BUTTON,
      });
      expect(mockManage).toHaveBeenCalledTimes(1);
    });
  });
});
