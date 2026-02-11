import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { AccountConnectCreateInitialAccount } from './AccountConnectCreateInitialAccount';
import { fireEvent } from '@testing-library/react-native';
import { AccountConnectSelectorsIDs } from '../AccountConnect.testIds';

const mockOnCreateAccount = jest.fn();

const render = () =>
  renderWithProvider(
    <AccountConnectCreateInitialAccount
      onCreateAccount={mockOnCreateAccount}
    />,
  );

describe('AccountConnectCreateInitialAccount', () => {
  it('calls onCreateAccount', () => {
    const { getByTestId } = render();
    fireEvent.press(
      getByTestId(AccountConnectSelectorsIDs.CREATE_ACCOUNT_BUTTON),
    );
    expect(mockOnCreateAccount).toHaveBeenCalled();
  });
});
