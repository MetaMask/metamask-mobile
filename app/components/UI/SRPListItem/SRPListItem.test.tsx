import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';

import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { SRPListItemSelectorsIDs } from './SRPListItem.testIds';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';

import SRPListItem from './SRPListItem';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import useMetrics from '../../hooks/useMetrics/useMetrics';

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useMetrics/useMetrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

const mockKeyringId1 = '01JKZ55Y6KPCYH08M6B9VSZWKW';
const mockKeyringId2 = '01JKZ56KRVYEEHC601HSNW28T2';

const mockWalletId1 = `entropy:${mockKeyringId1}`;

const mockKeyringName1 = 'Secret Recovery Phrase 1';

const mockKeyring1 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount1.address],
  metadata: {
    id: mockKeyringId1,
    name: '',
  },
};
const mockKeyring2 = {
  type: ExtendedKeyringTypes.simple,
  accounts: [internalAccount2.address],
  metadata: {
    id: mockKeyringId2,
    name: '',
  },
};

// Account groups representing multichain accounts
const mockAccountGroupId1 = `entropy:${mockKeyringId1}/0` as const;
const mockAccountGroupId2 = `entropy:${mockKeyringId1}/1` as const;

const mockAccountGroup1 = {
  id: mockAccountGroupId1,
  type: AccountGroupType.MultichainAccount as const,
  accounts: [internalAccount1.id],
  metadata: {
    name: 'Account 1',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 0 },
  },
};

const mockAccountGroup2 = {
  id: mockAccountGroupId2,
  type: AccountGroupType.MultichainAccount as const,
  accounts: [internalAccount2.id],
  metadata: {
    name: 'Account 2',
    pinned: false,
    hidden: false,
    entropy: { groupIndex: 1 },
  },
};

const mockAccountTreeControllerState: DeepPartial<AccountTreeControllerState> =
  {
    accountTree: {
      wallets: {
        [mockWalletId1]: {
          id: mockWalletId1,
          type: AccountWalletType.Entropy,
          metadata: {
            name: 'Wallet 1',
            entropy: { id: mockKeyringId1 },
          },
          groups: {
            [mockAccountGroupId1]: mockAccountGroup1,
            [mockAccountGroupId2]: mockAccountGroup2,
          },
        },
      },
      selectedAccountGroup: mockAccountGroupId1,
    },
  };

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [mockKeyring1, mockKeyring2],
      },
      AccountTreeController: mockAccountTreeControllerState,
    },
  },
};

const mockOnKeyringSelect = jest.fn();

const getTestId = (selector: string, keyringId: string) =>
  `${selector}-${keyringId}`;

describe('SRPList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    });
  });

  it('renders', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM,
          mockKeyring1.metadata.id,
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
          mockKeyring1.metadata.id,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('calls onActionComplete when the item is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const srpItem = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(srpItem);

    expect(mockOnKeyringSelect).toHaveBeenCalledWith(mockKeyring1.metadata.id);
  });

  it('tracks SECRET_RECOVERY_PHRASE_PICKER_CLICKED event when toggle button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const toggle = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(toggle);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
      )
        .addProperties({
          button_type: 'details',
        })
        .build(),
    );
  });

  it('displays account groups list when toggle is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const toggle = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(toggle);

    expect(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM_ACCOUNTS_LIST,
          mockKeyring1.metadata.id,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('displays correct account group count instead of individual accounts', () => {
    const { getByText } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    // The button label shows 2 account groups (multichain accounts)
    // instead of showing individual chain accounts (EVM, Solana, etc.)
    expect(getByText(/2 accounts/i)).toBeOnTheScreen();
  });

  it('displays account group names when expanded', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SRPListItem
        name={mockKeyringName1}
        keyring={mockKeyring1}
        onActionComplete={mockOnKeyringSelect}
      />,
      {
        state: initialState,
      },
    );

    const toggle = getByTestId(
      getTestId(
        SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
        mockKeyring1.metadata.id,
      ),
    );

    fireEvent.press(toggle);

    // Account group names are displayed (multichain account names)
    expect(getByText(mockAccountGroup1.metadata.name)).toBeOnTheScreen();
    expect(getByText(mockAccountGroup2.metadata.name)).toBeOnTheScreen();
  });
});
