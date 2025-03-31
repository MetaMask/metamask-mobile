import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';

import {
  internalAccount1,
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../util/test/initial-root-state';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';

import SelectSRP from './SelectSRP';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

const mockedNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
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

const mockKeyring1 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount1.address],
  metadata: mockKeyringMetadata1,
};

const mockKeyring2 = {
  type: ExtendedKeyringTypes.hd,
  accounts: [internalAccount2.address],
  metadata: mockKeyringMetadata2,
};

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: {
        keyrings: [mockKeyring1, mockKeyring2],
        keyringsMetadata: [mockKeyringMetadata1, mockKeyringMetadata2],
      },
    },
  },
};

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    context: {
      AccountsController: {
        state: mockAccountsControllerState,
      },
    },
  };
});

jest.mocked(Engine);

const render = () =>
  renderWithProvider(<SelectSRP />, {
    state: initialState,
  });

describe('SelectSRP', () => {
  it('navigates to the SRP reveal quiz', () => {
    const { getByText } = render();
    fireEvent.press(
      getByText(`${strings('accounts.secret_recovery_phrase')} 1`),
    );
    expect(mockedNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
      keyringId: mockKeyring1.metadata.id,
    });
  });
});
