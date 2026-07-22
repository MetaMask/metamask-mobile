import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import AccountSelector from './index';
import { IAccount } from './types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTrackerController: {
      syncBalanceWithAddresses: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../../hooks/useBlockExplorer', () => () => ({
  toBlockExplorer: jest.fn(),
  getBlockExplorerUrl: jest.fn(),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock('../AccountDetails', () => jest.fn(() => null));

const ACCOUNTS: IAccount[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    balance: '0x0',
    index: 0,
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    balance: '0x0',
    index: 1,
  },
];

const mockState = {
  engine: {
    backgroundState,
  },
};

const renderAccountSelector = (
  props: Partial<React.ComponentProps<typeof AccountSelector>> = {},
) =>
  renderWithProvider(
    <AccountSelector
      accounts={ACCOUNTS}
      selectedAccounts={[]}
      nextPage={jest.fn()}
      prevPage={jest.fn()}
      onUnlock={jest.fn()}
      onForget={jest.fn()}
      {...props}
    />,
    { state: mockState },
  );

describe('AccountSelector', () => {
  it('renders a checkbox for every account', () => {
    const { getAllByRole } = renderAccountSelector();

    const checkboxes = getAllByRole('checkbox');

    expect(checkboxes).toHaveLength(ACCOUNTS.length);
    checkboxes.forEach((checkbox) => {
      expect(checkbox.props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false, disabled: false }),
      );
    });
  });

  it('selects an account when its checkbox is pressed', () => {
    const onCheck = jest.fn();
    const { getAllByRole } = renderAccountSelector({ onCheck });

    const [firstCheckbox] = getAllByRole('checkbox');
    fireEvent.press(firstCheckbox);

    expect(onCheck).toHaveBeenCalledWith(ACCOUNTS[0].index);
    expect(getAllByRole('checkbox')[0].props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true }),
    );
  });

  it('does not toggle an already-imported account', () => {
    const onCheck = jest.fn();
    const { getAllByRole } = renderAccountSelector({
      onCheck,
      selectedAccounts: [ACCOUNTS[1].address],
    });

    const importedCheckbox = getAllByRole('checkbox')[1];
    expect(importedCheckbox.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );

    fireEvent.press(importedCheckbox);

    expect(onCheck).not.toHaveBeenCalled();
    expect(getAllByRole('checkbox')[1].props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
  });
});
