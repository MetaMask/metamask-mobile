import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../../util/activity-adapters';
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
});
