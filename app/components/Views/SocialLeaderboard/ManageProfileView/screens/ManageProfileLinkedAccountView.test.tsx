import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderShortAddress } from '../../../../../util/address';
import type { LinkableSocialAccount } from '../../hooks/useLinkableSocialAccounts';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import type { UseProfileControllerResult } from '../hooks/useProfileController';
import ManageProfileLinkedAccountView from './ManageProfileLinkedAccountView';

const mockGoBack = jest.fn();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();
const mockUseLinkableSocialAccounts = jest.fn<LinkableSocialAccount[], []>();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

jest.mock('../../hooks/useLinkableSocialAccounts', () => ({
  useLinkableSocialAccounts: () => mockUseLinkableSocialAccounts(),
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

const linkableAccounts: LinkableSocialAccount[] = [
  {
    id: internalAccount1.id,
    name: 'Main Wallet',
    address: internalAccount1.address,
    balanceLabel: '$1,234.56',
  },
  {
    id: internalAccount2.id,
    name: 'Trading',
    address: internalAccount2.address,
    balanceLabel: '',
  },
];

const controllerResult = (
  overrides: Partial<UseProfileControllerResult> = {},
): UseProfileControllerResult => ({
  isControllerBacked: false,
  profile: undefined,
  linkedAddresses: [],
  updateProfile: jest.fn().mockResolvedValue(undefined),
  createProfile: jest.fn().mockResolvedValue(undefined),
  fetchAndUpdateProfile: jest.fn(),
  fetchAndUpdateXAccount: jest.fn(),
  disconnectX: jest.fn(),
  getXAuthorizationUrl: jest.fn(),
  checkUsernameAvailability: jest.fn(),
  ...overrides,
});

const getRow = (accountId: string) =>
  screen.getByTestId(
    `${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${accountId}`,
  );

describe('ManageProfileLinkedAccountView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileController.mockReturnValue(controllerResult());
    mockUseLinkableSocialAccounts.mockReturnValue(linkableAccounts);
  });

  it('shows account names and balances instead of addresses', () => {
    renderWithProvider(<ManageProfileLinkedAccountView />, { state });

    const firstRow = getRow(internalAccount1.id);
    const secondRow = getRow(internalAccount2.id);

    expect(firstRow).toHaveTextContent('Main Wallet$1,234.56');
    expect(secondRow).toHaveTextContent('Trading');
    expect(firstRow).not.toHaveTextContent(
      renderShortAddress(internalAccount1.address),
    );
  });

  it('does not update the profile when not controller backed', () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue(
      controllerResult({ updateProfile }),
    );

    renderWithProvider(<ManageProfileLinkedAccountView />, { state });

    fireEvent.press(getRow(internalAccount1.id));

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('updates the profile with the selected EVM account', async () => {
    const updateProfile = jest.fn().mockResolvedValue(undefined);
    mockUseProfileController.mockReturnValue(
      controllerResult({ isControllerBacked: true, updateProfile }),
    );

    renderWithProvider(<ManageProfileLinkedAccountView />, { state });

    await act(async () => {
      fireEvent.press(getRow(internalAccount1.id));
    });

    expect(updateProfile).toHaveBeenCalledWith({
      linked_addresses: [`eip155:1:${internalAccount1.address}`],
    });
  });
});
