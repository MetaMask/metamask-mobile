import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';

import { SRPListSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPList.selectors';
import { SRPListItemSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPListItem.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  internalAccount1,
  internalAccount2,
} from '../../../util/test/accountsControllerTestUtils';

import SRPList from './SRPList';
import { fireEvent } from '@testing-library/react-native';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';

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

const mockKeyringMetadata1 = {
  id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
  name: '',
};
const mockKeyringMetadata2 = {
  id: '01JKZ56KRVYEEHC601HSNW28T2',
  name: '',
};

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [
          {
            type: ExtendedKeyringTypes.hd,
            accounts: [internalAccount1.address],
          },
          {
            type: ExtendedKeyringTypes.simple,
            accounts: [internalAccount2.address],
          },
        ],
        keyringsMetadata: [mockKeyringMetadata1, mockKeyringMetadata2],
      },
    },
  },
};

const mockOnKeyringSelect = jest.fn();

const getTestId = (selector: string, keyringId: string) =>
  `${selector}-${keyringId}`;

describe('SRPList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lists', () => {
    const { getByTestId } = renderWithProvider(
      <SRPList onKeyringSelect={mockOnKeyringSelect} />,
      {
        state: initialState,
      },
    );

    expect(getByTestId(SRPListSelectorsIDs.SRP_LIST)).toBeDefined();
  });

  it('executes onKeyringSelect when a srp is clicked', () => {
    const { getByTestId } = renderWithProvider(
      <SRPList onKeyringSelect={mockOnKeyringSelect} />,
      {
        state: initialState,
      },
    );

    fireEvent.press(
      getByTestId(
        getTestId(
          SRPListItemSelectorsIDs.SRP_LIST_ITEM,
          mockKeyringMetadata1.id,
        ),
      ),
    );

    expect(mockOnKeyringSelect).toHaveBeenCalledWith(mockKeyringMetadata1.id);
  });
});
