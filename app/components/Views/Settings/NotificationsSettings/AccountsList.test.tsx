import React from 'react';
import renderWithProvider, { DeepPartial } from '../../../../util/test/renderWithProvider';
import { AccountsList } from './AccountsList';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { Account } from '../../../../components/hooks/useAccounts/useAccounts.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { Hex } from '@metamask/utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumAddress } from '@ethereumjs/util';
import { RootState } from '../../../../reducers';
import { backgroundState } from '../../../../util/test/initial-root-state';

const MOCK_ACCOUNT_ADDRESSES = Object.values(
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
).map((account) => account.address);

const MOCK_ACCOUNT_1: Account = {
  name: 'Account 1',
  address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[0]) as Hex,
  type: KeyringTypes.hd,
  yOffset: 0,
  isSelected: false,
  assets: {
    fiatBalance: '\n0 ETH',
  },
  balanceError: undefined,
};
const MOCK_ACCOUNT_2: Account = {
  name: 'Account 2',
  address: toChecksumAddress(MOCK_ACCOUNT_ADDRESSES[1]) as Hex,
  type: KeyringTypes.hd,
  yOffset: 78,
  isSelected: true,
  assets: {
    fiatBalance: '\n< 0.00001 ETH',
  },
  balanceError: undefined,
};

const MOCK_ACCOUNTS = [MOCK_ACCOUNT_1, MOCK_ACCOUNT_2];

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NotificationServicesController: {
        metamaskNotificationsList: [],
      },
    },
  },
};

describe('AccountsList', () => {
  it('matches snapshot', () => {

    const { toJSON } = renderWithProvider(
      <AccountsList
        accounts={MOCK_ACCOUNTS}
        accountAvatarType={AvatarAccountType.JazzIcon}
        accountSettingsData={{}}
        updateAndfetchAccountSettings={jest.fn()}
        isUpdatingMetamaskNotificationsAccount={[]}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('triggers updateAndfetchAccountSettings on mount', () => {
    const updateAndfetchAccountSettings = jest.fn();
    renderWithProvider(
      <AccountsList
        accounts={MOCK_ACCOUNTS}
        accountAvatarType={AvatarAccountType.JazzIcon}
        accountSettingsData={{}}
        updateAndfetchAccountSettings={updateAndfetchAccountSettings}
        isUpdatingMetamaskNotificationsAccount={[]}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(updateAndfetchAccountSettings).toHaveBeenCalledTimes(1);
  });
});
