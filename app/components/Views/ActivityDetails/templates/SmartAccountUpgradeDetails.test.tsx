import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { renderShortAddress } from '../../../../util/address';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { SmartAccountUpgradeDetails } from './SmartAccountUpgradeDetails';
import { useAccountNames } from '../../../hooks/DisplayName/useAccountNames';

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));
jest.mock('../../../hooks/DisplayName/useAccountNames', () => ({
  useAccountNames: jest.fn(),
}));

const item = {
  type: 'smartAccountUpgrade',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xupgrade',
  data: { from: '0xacct', to: '0xacct' },
} as ActivityListItem;

describe('SmartAccountUpgradeDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tail-truncates a long account name in the hero', () => {
    (useAccountNames as jest.Mock).mockReturnValue([
      'Test Main Account a really long name',
    ]);

    const { getByText, queryByText } = renderWithProvider(
      <SmartAccountUpgradeDetails item={item} />,
    );

    // Full name is not rendered; a tail-truncated form (starts at the name, ends
    // with the ellipsis) is shown instead.
    expect(queryByText('Test Main Account a really long name')).toBeNull();
    expect(getByText(/^Test Main.+…$/)).toBeOnTheScreen();
  });

  it('falls back to the short address when no account name is resolved', () => {
    (useAccountNames as jest.Mock).mockReturnValue([undefined]);
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const itemNoName = {
      ...item,
      data: { from: address, to: address },
    } as ActivityListItem;

    const { getAllByText } = renderWithProvider(
      <SmartAccountUpgradeDetails item={itemNoName} />,
    );

    // The short address renders in both the hero and the metadata Address row.
    expect(getAllByText(renderShortAddress(address)).length).toBeGreaterThan(0);
  });

  it('uses the `to` address when `from` is absent', () => {
    (useAccountNames as jest.Mock).mockReturnValue([undefined]);
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const itemToOnly = {
      ...item,
      data: { to: address },
    } as ActivityListItem;

    const { getAllByText } = renderWithProvider(
      <SmartAccountUpgradeDetails item={itemToOnly} />,
    );

    expect(getAllByText(renderShortAddress(address)).length).toBeGreaterThan(0);
  });

  it('renders without an account avatar when no address is present', () => {
    (useAccountNames as jest.Mock).mockReturnValue([undefined]);
    const itemNoAddress = { ...item, data: {} } as ActivityListItem;

    const { getByTestId } = renderWithProvider(
      <SmartAccountUpgradeDetails item={itemNoAddress} />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.STATUS_ROW),
    ).toBeOnTheScreen();
  });
});
