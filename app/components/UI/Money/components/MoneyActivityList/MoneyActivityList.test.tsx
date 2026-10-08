import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import {
  CardProviderIds,
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { strings } from '../../../../../../locales/i18n';
import MOCK_MONEY_TRANSACTIONS from '../../constants/mockActivityData';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import { onchainItem } from '../../types/moneyActivity';
import MoneyActivityRow from '../MoneyActivityRow/MoneyActivityRow';
import { MoneySectionHeaderTestIds } from '../MoneySectionHeader/MoneySectionHeader.testIds';
import MoneyActivityList from './MoneyActivityList';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsFlag: jest.fn(),
}));
jest.mock('../MoneyActivityRow/MoneyActivityRow', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockSelectActivityDetailsFlag = jest.mocked(
  selectMoneyEnableActivityDetailsFlag,
);
const mockMoneyActivityRow = jest.mocked(MoneyActivityRow);
const items = MOCK_MONEY_TRANSACTIONS.map(onchainItem);
const cardEnrichment = {
  id: 'card-transaction-1',
  providerId: CardProviderIds.Baanx,
  timestamp: 1747005600000,
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '10.00', currency: 'USD' },
  merchant: { name: 'Example Merchant' },
  fundingSources: [
    {
      txHash: '0xsettlement-hash',
      walletAddress: '0x0000000000000000000000000000000000000001',
      network: 'monad',
      amount: '10.00',
      currency: 'USD',
    },
  ],
} satisfies CardTransaction;

const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { appTheme: 'light' }) => state,
    },
  });

const renderList = (component: React.ReactElement) =>
  render(<Provider store={createMockStore()}>{component}</Provider>);

describe('MoneyActivityList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectActivityDetailsFlag.mockReturnValue(true);
  });

  it('returns no content for an empty activity list', () => {
    const { queryByTestId } = renderList(<MoneyActivityList items={[]} />);

    expect(
      queryByTestId(MoneyActivityListTestIds.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the localized Activity heading', () => {
    const { getByTestId } = renderList(
      <MoneyActivityList items={items.slice(0, 1)} />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.TITLE)).toHaveTextContent(
      strings('money.activity.title'),
    );
  });

  it('renders at most five activity rows', () => {
    renderList(<MoneyActivityList items={items} />);

    expect(mockMoneyActivityRow).toHaveBeenCalledTimes(5);
  });

  it('passes preview items to rows in source order', () => {
    renderList(<MoneyActivityList items={items} />);

    expect(mockMoneyActivityRow.mock.calls[0][0].item).toBe(items[0]);
    expect(mockMoneyActivityRow.mock.calls[4][0].item).toBe(items[4]);
  });

  it('leaves the Activity heading non-pressable for five items', () => {
    const onHeaderPress = jest.fn();
    const { getByTestId, queryByTestId } = renderList(
      <MoneyActivityList
        items={items.slice(0, 5)}
        onHeaderPress={onHeaderPress}
      />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.TITLE)).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityListTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
    expect(onHeaderPress).not.toHaveBeenCalled();
  });

  it('calls the Activity heading callback when more than five items exist', () => {
    const onHeaderPress = jest.fn();
    const { getByTestId } = renderList(
      <MoneyActivityList items={items} onHeaderPress={onHeaderPress} />,
    );

    fireEvent.press(getByTestId(MoneyActivityListTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledTimes(1);
  });

  it('shows the Activity heading chevron when more than five items exist', () => {
    const { getByTestId } = renderList(
      <MoneyActivityList items={items} onHeaderPress={jest.fn()} />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.CHEVRON)).toBeOnTheScreen();
  });

  it('calls the Activity heading callback when upstream pagination has more items', () => {
    const onHeaderPress = jest.fn();
    const { getByTestId } = renderList(
      <MoneyActivityList
        items={items.slice(0, 5)}
        hasMore
        onHeaderPress={onHeaderPress}
      />,
    );

    fireEvent.press(getByTestId(MoneyActivityListTestIds.HEADER));

    expect(onHeaderPress).toHaveBeenCalledTimes(1);
  });

  it('leaves the Activity heading non-pressable without a callback', () => {
    const { getByTestId, queryByTestId } = renderList(
      <MoneyActivityList items={items} />,
    );

    expect(getByTestId(MoneySectionHeaderTestIds.TITLE)).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityListTestIds.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneySectionHeaderTestIds.CHEVRON),
    ).not.toBeOnTheScreen();
  });

  it('passes disabled privacy mode to rows by default', () => {
    renderList(<MoneyActivityList items={items.slice(0, 1)} />);

    expect(mockMoneyActivityRow.mock.calls[0][0].privacyMode).toBe(false);
  });

  it('passes enabled privacy mode to rows', () => {
    renderList(<MoneyActivityList items={items.slice(0, 1)} privacyMode />);

    expect(mockMoneyActivityRow.mock.calls[0][0].privacyMode).toBe(true);
  });

  it('passes Money address to rows', () => {
    const moneyAddress = '0x0000000000000000000000000000000000000001';
    renderList(
      <MoneyActivityList
        items={items.slice(0, 1)}
        moneyAddress={moneyAddress}
      />,
    );

    expect(mockMoneyActivityRow.mock.calls[0][0].moneyAddress).toBe(
      moneyAddress,
    );
  });

  it('passes card enrichment to rows', () => {
    const cardEnrichmentByHash = new Map<string, CardTransaction>([
      ['0xsettlement-hash', cardEnrichment],
    ]);

    renderList(
      <MoneyActivityList
        items={items.slice(0, 1)}
        cardEnrichmentByHash={cardEnrichmentByHash}
      />,
    );

    expect(mockMoneyActivityRow.mock.calls[0][0].cardEnrichmentByHash).toBe(
      cardEnrichmentByHash,
    );
  });

  it('passes the activity callback to rows when details are enabled', () => {
    const onItemPress = jest.fn();
    renderList(
      <MoneyActivityList items={items.slice(0, 1)} onItemPress={onItemPress} />,
    );

    mockMoneyActivityRow.mock.calls[0][0].onPress?.(MOCK_MONEY_TRANSACTIONS[0]);

    expect(onItemPress).toHaveBeenCalledTimes(1);
    expect(onItemPress).toHaveBeenCalledWith(MOCK_MONEY_TRANSACTIONS[0]);
  });

  it('removes the activity callback from rows when details are disabled', () => {
    mockSelectActivityDetailsFlag.mockReturnValue(false);
    const onItemPress = jest.fn();
    renderList(
      <MoneyActivityList items={items.slice(0, 1)} onItemPress={onItemPress} />,
    );

    const rowOnPress = mockMoneyActivityRow.mock.calls[0][0].onPress;

    expect(rowOnPress).toBeUndefined();
    expect(onItemPress).not.toHaveBeenCalled();
  });
});
