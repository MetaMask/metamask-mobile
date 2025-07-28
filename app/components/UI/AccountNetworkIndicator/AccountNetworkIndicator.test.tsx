import React from 'react';
import { CaipChainId, KnownCaipNamespace } from '@metamask/utils';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountNetworkIndicator from './AccountNetworkIndicator';

const BUSINESS_ACCOUNT = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const PERSONAL_ACCOUNT = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_NETWORKS_WITH_TRANSACTION_ACTIVITY = {
  [BUSINESS_ACCOUNT.toLowerCase()]: {
    namespace: 'eip155:0',
    activeChains: ['1', '56'],
  },
  [PERSONAL_ACCOUNT.toLowerCase()]: {
    namespace: 'eip155:0',
    activeChains: ['1', '137'],
  },
};

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      MultichainNetworkController: {
        networksWithTransactionActivity:
          MOCK_NETWORKS_WITH_TRANSACTION_ACTIVITY,
      },
    },
  },
};

describe('AccountNetworkIndicator', () => {
  it('should render correctly', () => {
    const partialAccount = {
      address: BUSINESS_ACCOUNT,
      scopes: [`${KnownCaipNamespace.Eip155}:0` as CaipChainId],
    };

    const { toJSON } = renderScreen(
      () => <AccountNetworkIndicator partialAccount={partialAccount} />,
      {
        name: 'AccountNetworkIndicator',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
