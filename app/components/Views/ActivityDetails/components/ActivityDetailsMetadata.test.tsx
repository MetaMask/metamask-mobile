import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { ActivityDetailsMetadata } from './ActivityDetailsMetadata';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { strings } from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

const makeItem = (
  overrides: Partial<ActivityListItem> = {},
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp: 1,
    hash: '0xabc0000000000000000000000000000000000000000000000000000000abcdef',
    data: { from: '0xfrom', to: '0xto' },
    ...overrides,
  }) as ActivityListItem;

describe('ActivityDetailsMetadata', () => {
  it('renders a copyable transaction id', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={makeItem()} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeOnTheScreen();
  });

  it('shows From and To rows when a template opts in via addressRows', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata
        item={makeItem()}
        addressRows={{ from: '0xfrom', to: '0xto' }}
      />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeOnTheScreen();
    expect(getByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.ADDRESS_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.ACCOUNT_ROW)).toBeNull();
  });

  it('defaults to a single Account row (no From/To) when addressRows is omitted, e.g. swaps', () => {
    const item = makeItem({
      type: 'swap',
      // Account row keys on `data.from`, not a router `to`.
      data: { from: '0xacct' },
    } as unknown as ActivityListItem);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.ACCOUNT_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeNull();
  });

  it('shows a single Address row (no From/To) for a smart account upgrade', () => {
    const item = makeItem({
      type: 'smartAccountUpgrade',
      data: { from: '0xacct', to: '0xacct' },
    } as Partial<ActivityListItem>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.ADDRESS_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeNull();
  });

  it('renders the Address row without a value when an upgrade has no address', () => {
    const item = makeItem({
      type: 'smartAccountUpgrade',
      data: {},
    } as Partial<ActivityListItem>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    // No address -> the Address row collapses (empty value), but the upgrade
    // path is taken so neither From/To nor the Account row appear.
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.ADDRESS_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.ACCOUNT_ROW)).toBeNull();
  });

  it('shows a single Account row when only one party is known', () => {
    const item = makeItem({
      data: { from: '0xfrom' },
    } as Partial<ActivityListItem>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.ACCOUNT_ROW),
    ).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.FROM_ROW)).toBeNull();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.TO_ROW)).toBeNull();
  });

  it('shows the Solana Pay source account resolved from the checkpoint account ID', () => {
    const item = makeItem();
    const solanaAddress = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';

    const { getByText } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
      {
        state: {
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  accounts: {
                    'solana-account-id': {
                      id: 'solana-account-id',
                      address: solanaAddress,
                    },
                  },
                  selectedAccount: 'solana-account-id',
                },
              },
              TransactionController: {
                transactions: [
                  {
                    id: 'tx-1',
                    chainId: '0x1',
                    hash: item.hash,
                    metamaskPay: {
                      solanaExecution: {
                        phase: 'ready',
                        sourceWalletAccountId: 'solana-account-id',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    );

    expect(
      getByText(strings('confirm.solana_pay.source_account')),
    ).toBeOnTheScreen();
    expect(getByText(renderShortAddress(solanaAddress))).toBeOnTheScreen();
  });

  it('omits the transaction id copy control when there is no hash', () => {
    const item = makeItem({ hash: '' } as Partial<ActivityListItem>);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsMetadata item={item} />,
    );

    // No hash -> the transaction id row (and its copy control) collapse.
    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_ROW),
    ).toBeNull();
    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.TRANSACTION_ID_COPY),
    ).toBeNull();
  });
});
