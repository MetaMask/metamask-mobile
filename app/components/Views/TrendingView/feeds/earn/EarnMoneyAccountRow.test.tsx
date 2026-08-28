import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { EarnMoneyAccountSearchItem } from './earnSearchTypes';
import EarnMoneyAccountRow from './EarnMoneyAccountRow';

jest.mock('../../../../../../images/money-balance.svg', () => {
  const { Text } = jest.requireActual('react-native');

  return ({ name }: { name?: string }) => <Text>{name}</Text>;
});

jest.mock('../../../../UI/Earn/components/EarnNewTag', () => {
  const { Text } = jest.requireActual('react-native');

  return () => <Text testID="earn-search-money-new-tag">New</Text>;
});

describe('EarnMoneyAccountRow', () => {
  it('renders a balance skeleton while balance is loading', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: true,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, getByText, queryByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(getByTestId('earn-search-money-balance-skeleton')).toBeOnTheScreen();
    expect(
      getByText(strings('earn_module.rate_apy', { percentage: '4.2' })),
    ).toBeOnTheScreen();
    expect(queryByText(strings('earn_module.get_started'))).toBeNull();
  });

  it('renders an APY skeleton while the rate is loading', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'loading',
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, getByText, queryByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(getByTestId('earn-search-money-apy-skeleton')).toBeOnTheScreen();
    expect(getByText('$12.00')).toBeOnTheScreen();
    expect(queryByText(strings('earn_module.rate_unavailable'))).toBeNull();
  });

  it('renders New Tag and Get started text for a zero balance if onboarding is needed', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, getByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(getByTestId('earn-search-money-new-tag')).toBeOnTheScreen();
    expect(getByText(strings('earn_module.get_started'))).toBeOnTheScreen();
  });

  it('renders Start earning for an onboarded zero-balance Money account', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByText, queryByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded={false}
      />,
    );

    expect(
      getByText(strings('money.asset_overview.cta.start_earning')),
    ).toBeOnTheScreen();
    expect(queryByText(strings('earn_module.get_started'))).toBeNull();
  });

  it('renders the formatted fiat balance for a non-zero balance', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByText, queryByTestId } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(getByText('$12.00')).toBeOnTheScreen();
    expect(queryByTestId('earn-search-money-new-tag')).toBeNull();
  });

  it('masks a non-zero fiat balance when privacy mode is enabled', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, queryByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
        privacyMode
      />,
    );

    expect(getByTestId('earn-search-money-balance')).toHaveTextContent(
      '•'.repeat(9),
    );
    expect(queryByText('$12.00')).toBeNull();
  });

  it('renders balance unavailable when a non-zero balance has no fiat value', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(
      getByText(strings('earn_module.balance_unavailable')),
    ).toBeOnTheScreen();
  });

  it('renders rate unavailable when APY is missing', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'unavailable',
    } satisfies EarnMoneyAccountSearchItem;

    const { getByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(
      getByText(strings('earn_module.rate_unavailable')),
    ).toBeOnTheScreen();
  });

  it('renders the APY copy when the rate is ready', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByText } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={jest.fn()}
        isOnboardingRedirectNeeded
      />,
    );

    expect(
      getByText(strings('earn_module.rate_apy', { percentage: '4.2' })),
    ).toBeOnTheScreen();
  });

  it('passes the Money item to onPress', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '12',
      balanceFiat: '$12.00',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;
    const onPress = jest.fn();

    const { getByTestId } = render(
      <EarnMoneyAccountRow
        item={item}
        onPress={onPress}
        isOnboardingRedirectNeeded
      />,
    );

    fireEvent.press(getByTestId('earn-search-money-row'));

    expect(onPress).toHaveBeenCalledWith(item);
  });
});
