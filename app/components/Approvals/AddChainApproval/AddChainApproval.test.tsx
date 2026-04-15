import React from 'react';
import AddChainApproval from './AddChainApproval';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { ApprovalRequest } from '@metamask/approval-controller';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../UI/NetworkVerificationInfo', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (_props: Record<string, unknown>) => (
      <View testID="network-verification-info">
        <Text>NetworkVerificationInfo Mock</Text>
      </View>
    ),
  };
});

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApprovalRequest = (approvalRequest?: ApprovalRequest<any>) => {
  (
    useApprovalRequest as jest.MockedFn<typeof useApprovalRequest>
  ).mockReturnValue({
    approvalRequest,
    onConfirm: jest.fn(),
    onReject: jest.fn(),
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe('AddChainApproval', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders', () => {
    mockApprovalRequest({
      type: ApprovalTypes.ADD_ETHEREUM_CHAIN,
      requestData: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/',
        ticker: 'ETH',
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { toJSON } = renderWithProvider(<AddChainApproval />, { state: initialState });

    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if no approval request', () => {
    mockApprovalRequest(undefined);

    const { toJSON } = renderWithProvider(<AddChainApproval />, { state: initialState });
    expect(toJSON()).toMatchSnapshot();
  });

  it('returns null if incorrect approval request type', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockApprovalRequest({ type: ApprovalTypes.CONNECT_ACCOUNTS } as any);

    const { toJSON } = renderWithProvider(<AddChainApproval />, { state: initialState });
    expect(toJSON()).toMatchSnapshot();
  });
});
