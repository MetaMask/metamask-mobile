import React from 'react';
import { merge } from 'lodash';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';

import { stakingClaimConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { MusdClaimInfo } from './musd-claim-info';
import {
  DISTRIBUTOR_CLAIM_ABI,
  MERKL_CLAIM_CHAIN_ID,
} from '../../../../../UI/Earn/components/MerklRewards/constants';

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

jest.mock('../../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
  },
}));

jest.mock('../../../hooks/gas/useIsGaslessSupported', () => ({
  useIsGaslessSupported: jest.fn().mockReturnValue({
    isSupported: false,
    isSmartTransaction: false,
  }),
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../UI/animated-pulse', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock(
  '../../../../../UI/Earn/components/MerklRewards/merkl-client',
  () => ({
    ...jest.requireActual(
      '../../../../../UI/Earn/components/MerklRewards/merkl-client',
    ),
    getClaimedAmountFromContract: jest.fn().mockResolvedValue('0'),
  }),
);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn().mockReturnValue(() => undefined),
    }),
  };
});

const USER_ADDRESS = '0x1234567890123456789012345678901234567890';
const TOKEN_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const encodeClaimData = (amount: string): string => {
  const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
  return contractInterface.encodeFunctionData('claim', [
    [USER_ADDRESS],
    [TOKEN_ADDRESS],
    [amount],
    [[]],
  ]);
};

const claimData = encodeClaimData('10010000'); // 10.01 mUSD (6 decimals)

const musdClaimConfirmationState = merge({}, stakingClaimConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.musdClaim,
            chainId: MERKL_CLAIM_CHAIN_ID,
            txParams: {
              data: claimData,
              from: USER_ADDRESS,
            },
          },
        ],
      } as unknown as TransactionControllerState,
      NetworkController: {
        networkConfigurationsByChainId: {
          [MERKL_CLAIM_CHAIN_ID]: {
            name: 'Linea Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                url: 'https://linea-mainnet.infura.io/v3/1234567890',
                name: 'Linea Mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
});

describe('MusdClaimInfo', () => {
  const mockUseConfirmActions = jest.mocked(useConfirmActions);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });
  });

  it('renders claim bonus UI with expected elements', () => {
    const { getByText, getByTestId } = renderWithProvider(<MusdClaimInfo />, {
      state: musdClaimConfirmationState,
    });

    expect(getByTestId('musd-claim-info')).toBeDefined();
    expect(getByText('Claiming to')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Linea Mainnet')).toBeDefined();
    expect(getByText('Network fee')).toBeDefined();
  });
});
