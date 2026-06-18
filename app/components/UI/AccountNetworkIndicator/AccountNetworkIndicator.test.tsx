import React from 'react';
import { EthScope } from '@metamask/keyring-api';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountNetworkIndicator from './AccountNetworkIndicator';

const MOCK_ETH_ACCOUNT = '0xS0M3FAk3ADDr355Dc8Ebf7A2152cdfB9D43FAk3';

const mockAvatarGroup = jest.fn(() => null);

jest.mock('../../../component-library/components/Avatars/AvatarGroup', () => ({
  __esModule: true,
  default: (props: unknown) => mockAvatarGroup(props),
}));

const createMockState = (): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      MultichainNetworkController: {
        ...backgroundState.MultichainNetworkController,
        networksWithTransactionActivity: {
          [MOCK_ETH_ACCOUNT.toLowerCase()]: {
            activeChains: ['0x1', '0x89'],
          },
        },
      },
    },
  },
});

describe('AccountNetworkIndicator', () => {
  beforeEach(() => {
    mockAvatarGroup.mockClear();
  });

  it('renders network avatars for an account with transaction activity', () => {
    const partialAccount = {
      address: MOCK_ETH_ACCOUNT,
      scopes: [EthScope.Eoa],
    };

    const { getByTestId } = renderWithProvider(
      <AccountNetworkIndicator partialAccount={partialAccount} />,
      { state: createMockState() },
    );

    expect(getByTestId('network-container')).toBeTruthy();
    expect(mockAvatarGroup).toHaveBeenCalledTimes(1);
  });

  it('skips re-render when partialAccount object reference changes but fields are unchanged', () => {
    const scopes = [EthScope.Eoa];
    const initialPartialAccount = {
      address: MOCK_ETH_ACCOUNT,
      scopes,
    };

    const { rerender } = renderWithProvider(
      <AccountNetworkIndicator partialAccount={initialPartialAccount} />,
      { state: createMockState() },
    );

    expect(mockAvatarGroup).toHaveBeenCalledTimes(1);

    rerender(
      <AccountNetworkIndicator
        partialAccount={{ address: MOCK_ETH_ACCOUNT, scopes }}
      />,
    );

    expect(mockAvatarGroup).toHaveBeenCalledTimes(1);
  });

  it('re-renders when partialAccount address changes', () => {
    const scopes = [EthScope.Eoa];
    const initialPartialAccount = {
      address: MOCK_ETH_ACCOUNT,
      scopes,
    };

    const { rerender } = renderWithProvider(
      <AccountNetworkIndicator partialAccount={initialPartialAccount} />,
      { state: createMockState() },
    );

    expect(mockAvatarGroup).toHaveBeenCalledTimes(1);

    rerender(
      <AccountNetworkIndicator
        partialAccount={{
          address: '0xDifferentAddress0000000000000000000001',
          scopes,
        }}
      />,
    );

    expect(mockAvatarGroup).toHaveBeenCalledTimes(2);
  });
});
