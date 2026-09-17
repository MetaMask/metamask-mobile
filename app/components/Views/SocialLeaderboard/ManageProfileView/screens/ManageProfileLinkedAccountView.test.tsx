import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import ManageProfileLinkedAccountView from './ManageProfileLinkedAccountView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual(
    '@metamask/design-system-react-native',
  ) as Record<string, unknown>;
  return {
    ...actual,
    AvatarAccount: () => null,
  };
});

const state = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('ManageProfileLinkedAccountView', () => {
  it('lists wallet accounts and keeps the selected account checked after a press', () => {
    renderWithProvider(<ManageProfileLinkedAccountView />, { state });

    const selectedRow = screen.getByTestId(
      `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${internalAccount2.id}`,
    );
    const otherRow = screen.getByTestId(
      `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${internalAccount1.id}`,
    );

    expect(selectedRow).toHaveTextContent('Account 2');
    expect(otherRow).toHaveTextContent('Account 1');

    fireEvent.press(otherRow);

    expect(selectedRow).toHaveTextContent('Account 2');
    expect(otherRow).toHaveTextContent('Account 1');
  });
});
