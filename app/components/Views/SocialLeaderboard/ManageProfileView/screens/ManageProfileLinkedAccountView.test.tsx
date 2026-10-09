import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
  internalAccount1,
  internalAccount2,
  internalSolanaAccount1,
} from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import type { UseProfileControllerResult } from '../hooks/useProfileController';
import ManageProfileLinkedAccountView from './ManageProfileLinkedAccountView';

const mockGoBack = jest.fn();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileController.mockReturnValue({
      isControllerBacked: false,
      profile: undefined,
      linkedAddresses: [],
      updateProfile: jest.fn().mockResolvedValue(undefined),
      checkUsernameAvailability: jest.fn(),
    });
  });

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

  it('updates the profile with the selected EVM account', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile,
      checkUsernameAvailability: jest.fn(),
    });

    renderWithProvider(<ManageProfileLinkedAccountView />, { state });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${internalAccount1.id}`,
        ),
      );
    });

    expect(updateProfile).toHaveBeenCalledWith({
      linked_addresses: [`eip155:1:${internalAccount1.address}`],
    });
  });

  it('does not list non-EVM accounts', () => {
    renderWithProvider(<ManageProfileLinkedAccountView />, {
      state: {
        ...state,
        engine: {
          ...state.engine,
          backgroundState: {
            ...state.engine.backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SOLANA,
          },
        },
      },
    });

    expect(
      screen.queryByTestId(
        `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${internalSolanaAccount1.id}`,
      ),
    ).toBeNull();
  });
});
