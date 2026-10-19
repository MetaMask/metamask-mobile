import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import MoneyMetaMaskCard from './MoneyMetaMaskCard';
import { MoneyMetaMaskCardTestIds } from './MoneyMetaMaskCard.testIds';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { mockTheme } from '../../../../../util/theme';
import {
  CardActions,
  CardEntryPoint,
  CardFlow,
  CardScreens,
} from '../../../Card/util/metrics';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'built-event' }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'baanx'),
}));

jest.mock('../MoneyCardTiltAnimation', () => 'MoneyCardTiltAnimation');

const analyticsProps = {
  analyticsScreen: CardScreens.MONEY_HOME,
  analyticsEntryPoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
  analyticsFlow: CardFlow.MONEY_ACCOUNT_LINKAGE,
  analyticsCardState: 'unlinked_card',
};

describe('MoneyMetaMaskCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['upsell', 'money.metamask_card.upsell_title'],
    ['link', 'money.metamask_card.link_title'],
    ['manage', 'money.metamask_card.title'],
    ['verifying', 'money.metamask_card.title'],
    ['loading', 'money.metamask_card.title'],
  ] as const)('renders the %s mode title', (mode, titleKey) => {
    render(
      <MoneyMetaMaskCard
        mode={mode}
        onGetNowPress={jest.fn()}
        cardBalance="$2,342.86"
      />,
    );

    expect(
      screen.getByTestId(MoneySectionHeaderTestIds.TITLE),
    ).toHaveTextContent(strings(titleKey));
  });

  it('renders upsell content with the virtual card row', () => {
    render(<MoneyMetaMaskCard onGetNowPress={jest.fn()} showMetalCard />);

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.VIRTUAL_CARD_ROW),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('money.metamask_card.subtitle')),
    ).toBeOnTheScreen();
  });

  it('renders virtual-card cashback when showMetalCard is false in link mode', () => {
    render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        showMetalCard={false}
      />,
    );

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_CASHBACK),
    ).toHaveTextContent(
      strings('money.metamask_card.link_bullet_cashback', {
        percentage: '1',
      }),
    );
  });

  it('dispatches an upsell content press to onGetNowPress', () => {
    const onGetNowPress = jest.fn();
    render(<MoneyMetaMaskCard onGetNowPress={onGetNowPress} />);

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(onGetNowPress).toHaveBeenCalledTimes(1);
    expect(onGetNowPress).toHaveBeenCalledWith();
  });

  it('dispatches an upsell header press to both header and mode handlers', () => {
    const onGetNowPress = jest.fn();
    const onHeaderPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        onGetNowPress={onGetNowPress}
        onHeaderPress={onHeaderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledWith('upsell');
    expect(onGetNowPress).toHaveBeenCalledTimes(1);
  });

  it('renders link content with live APY values', () => {
    render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        apy={4}
        showMetalCard
      />,
    );

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
    ).toHaveTextContent(
      strings('money.metamask_card.link_subtitle', { apy: 4 }),
    );
    expect(
      screen.getByText(
        strings('money.metamask_card.link_bullet_cashback', {
          percentage: '3',
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('money.metamask_card.link_bullet_apy', { apy: 4 }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders APY-free link content when APY is unavailable', () => {
    render(
      <MoneyMetaMaskCard mode="link" onGetNowPress={jest.fn()} hideCardImage />,
    );

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
    ).toHaveTextContent(strings('money.metamask_card.link_subtitle_no_apy'));
    expect(
      screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_CARD_IMAGE),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneyMetaMaskCardTestIds.LINK_BULLET_APY),
    ).not.toBeOnTheScreen();
  });

  it('dispatches a link content press to onLinkPress', () => {
    const onLinkPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        onLinkPress={onLinkPress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(onLinkPress).toHaveBeenCalledTimes(1);
  });

  it('dispatches a link header press to both header and mode handlers', () => {
    const onHeaderPress = jest.fn();
    const onLinkPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        onHeaderPress={onHeaderPress}
        onLinkPress={onLinkPress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledWith('link');
    expect(onLinkPress).toHaveBeenCalledTimes(1);
  });

  it('disables link header and content interactions', () => {
    const onHeaderPress = jest.fn();
    const onLinkPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        onHeaderPress={onHeaderPress}
        onLinkPress={onLinkPress}
        isLinkDisabled
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(
      screen.queryByTestId(MoneyMetaMaskCardTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
    expect(onHeaderPress).not.toHaveBeenCalled();
    expect(onLinkPress).not.toHaveBeenCalled();
  });

  it('renders manage balance and cashback', () => {
    render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        cardBalance="$2,342.86"
        showMetalCard
      />,
    );

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
    ).toHaveTextContent('$2,342.86');
    expect(
      screen.getByText(
        strings('money.metamask_card.cashback', { percentage: '3' }),
      ),
    ).toBeOnTheScreen();
  });

  it('masks the manage balance in privacy mode', () => {
    render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        cardBalance="$2,342.86"
        privacyMode
      />,
    );

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE),
    ).toHaveTextContent('•'.repeat(9));
  });

  it('renders virtual-card cashback when showMetalCard is false in manage mode', () => {
    render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        showMetalCard={false}
      />,
    );

    expect(
      screen.getByText(
        strings('money.metamask_card.cashback', { percentage: '1' }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the stale manage balance with alternative text color', () => {
    const { getByTestId, rerender } = render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        cardBalance="$2,342.86"
      />,
    );
    const freshColor = StyleSheet.flatten(
      getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE).props.style,
    ).color;

    rerender(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        cardBalance="$2,342.86"
        isBalanceStale
      />,
    );
    const staleColor = StyleSheet.flatten(
      getByTestId(MoneyMetaMaskCardTestIds.MANAGE_BALANCE).props.style,
    ).color;

    expect(staleColor).toBe(mockTheme.colors.text.alternative);
    expect(staleColor).not.toBe(freshColor);
  });

  it('dispatches a manage content press to onManagePress', () => {
    const onManagePress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        onManagePress={onManagePress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(onManagePress).toHaveBeenCalledTimes(1);
  });

  it('dispatches a manage header press to both header and mode handlers', () => {
    const onHeaderPress = jest.fn();
    const onManagePress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        onHeaderPress={onHeaderPress}
        onManagePress={onManagePress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledWith('manage');
    expect(onManagePress).toHaveBeenCalledTimes(1);
  });

  it('renders verification state without interactive targets', () => {
    const onHeaderPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="verifying"
        onGetNowPress={jest.fn()}
        onHeaderPress={onHeaderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.VERIFYING_BANNER),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('money.metamask_card.verification_pending')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneyMetaMaskCardTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(onHeaderPress).not.toHaveBeenCalled();
  });

  it('renders loading state without interactive targets', () => {
    const onHeaderPress = jest.fn();
    render(
      <MoneyMetaMaskCard
        mode="loading"
        onGetNowPress={jest.fn()}
        onHeaderPress={onHeaderPress}
      />,
    );

    fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

    expect(
      screen.getByTestId(MoneyMetaMaskCardTestIds.LOADING_SPINNER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MoneyMetaMaskCardTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(onHeaderPress).not.toHaveBeenCalled();
  });

  it('omits analytics when location properties are absent', () => {
    render(<MoneyMetaMaskCard onGetNowPress={jest.fn()} />);

    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks one settled card view when analytics becomes ready', () => {
    const { rerender } = render(
      <MoneyMetaMaskCard
        mode="link"
        onGetNowPress={jest.fn()}
        {...analyticsProps}
        analyticsReady={false}
      />,
    );

    rerender(
      <MoneyMetaMaskCard
        mode="manage"
        onGetNowPress={jest.fn()}
        {...analyticsProps}
        analyticsCardState="linked_card"
        analyticsReady
      />,
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith({
      provider: 'baanx',
      screen: CardScreens.MONEY_HOME,
      entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
      mode: 'manage',
      card_type: 'virtual',
      flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
      card_state: 'linked_card',
      action: undefined,
    });
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built-event' });
  });

  it.each([
    ['upsell', CardActions.MONEY_ACCOUNT_METAMASK_CARD_GET_NOW_BUTTON],
    ['link', CardActions.MONEY_ACCOUNT_METAMASK_CARD_LINK_BUTTON],
    ['manage', CardActions.MONEY_ACCOUNT_METAMASK_CARD_MANAGE_BUTTON],
  ] as const)(
    'tracks %s content presses with the mode action',
    (mode, action) => {
      render(
        <MoneyMetaMaskCard
          mode={mode}
          onGetNowPress={jest.fn()}
          onLinkPress={jest.fn()}
          onManagePress={jest.fn()}
          {...analyticsProps}
        />,
      );
      jest.clearAllMocks();

      fireEvent.press(screen.getByTestId(MoneyMetaMaskCardTestIds.CONTENT));

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        provider: 'baanx',
        screen: CardScreens.MONEY_HOME,
        entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
        mode,
        card_type: 'virtual',
        flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
        card_state: 'unlinked_card',
        action,
      });
      expect(mockBuild).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built-event' });
    },
  );
});
