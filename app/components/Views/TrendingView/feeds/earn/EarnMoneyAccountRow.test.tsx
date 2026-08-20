import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { EarnMoneyAccountSearchItem } from './earnSearchTypes';
import EarnMoneyAccountRow from './EarnMoneyAccountRow';

jest.mock('@metamask/design-system-react-native', () => {
  const {
    Pressable,
    Text: TextComponent,
    View,
  } = jest.requireActual('react-native');

  return {
    Box: ({ children, ...props }: React.ComponentProps<typeof View>) => (
      <View {...props}>{children}</View>
    ),
    BoxAlignItems: { Center: 'center', End: 'flex-end' },
    BoxFlexDirection: { Row: 'row' },
    ButtonBase: ({
      children,
      ...props
    }: React.ComponentProps<typeof Pressable>) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    FontWeight: { Medium: '500' },
    Skeleton: ({ testID }: { testID?: string }) => <View testID={testID} />,
    Text: ({
      children,
      ...props
    }: React.ComponentProps<typeof TextComponent>) => (
      <TextComponent {...props}>{children}</TextComponent>
    ),
    TextColor: {
      TextAlternative: 'text-alternative',
      TextDefault: 'text-default',
    },
    TextVariant: { BodyMd: 'body-md', BodySm: 'body-sm' },
  };
});

jest.mock('../../../../../../images/money-balance.svg', () => {
  const { Text } = jest.requireActual('react-native');

  return ({ name }: { name?: string }) => <Text>{name}</Text>;
});

jest.mock('../../../../UI/Earn/components/EarnNewTag', () => {
  const { Text } = jest.requireActual('react-native');

  return () => <Text testID="earn-search-money-new-tag">New</Text>;
});

describe('EarnMoneyAccountRow', () => {
  it('renders Money balance and APY skeletons independently', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: true,
      rateStatus: 'loading',
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, queryByText } = render(
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
    );

    expect(getByTestId('earn-search-money-balance-skeleton')).toBeOnTheScreen();
    expect(getByTestId('earn-search-money-apy-skeleton')).toBeOnTheScreen();
    expect(queryByText(strings('earn_module.get_started'))).toBeNull();
  });

  it('renders New and Get started for a zero balance', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
      apyPercent: 4.2,
    } satisfies EarnMoneyAccountSearchItem;

    const { getByTestId, getByText } = render(
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
    );

    expect(getByTestId('earn-search-money-new-tag')).toBeOnTheScreen();
    expect(getByText(strings('earn_module.get_started'))).toBeOnTheScreen();
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
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
    );

    expect(getByText('$12.00')).toBeOnTheScreen();
    expect(queryByTestId('earn-search-money-new-tag')).toBeNull();
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
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
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
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
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
      <EarnMoneyAccountRow item={item} onPress={jest.fn()} />,
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
      <EarnMoneyAccountRow item={item} onPress={onPress} />,
    );

    fireEvent.press(getByTestId('earn-search-money-row'));

    expect(onPress).toHaveBeenCalledWith(item);
  });
});
