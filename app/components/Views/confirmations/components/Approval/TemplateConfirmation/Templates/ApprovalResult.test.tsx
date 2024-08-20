import React from 'react';
import { render } from '@testing-library/react-native';
import TemplateConfirmation, {
  TemplateConfirmationProps,
} from '../TemplateConfirmation';
import { ApprovalTypes } from '../../../../../../../core/RPCMethods/RPCMethodMiddleware';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

describe('ApprovalResult', () => {
  const mockProps: TemplateConfirmationProps = {
    approvalRequest: {
      id: 'mocked',
      origin: 'metamask',
      requestData: {
        message: 'Success message',
      },
      type: ApprovalTypes.RESULT_SUCCESS,
      expectsResult: false,
      requestState: null,
      time: 123456,
    },
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders approval result with success type', () => {
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(wrapper).toMatchSnapshot();
  });

  it('renders approval result with error type', () => {
    const errorMockProps: TemplateConfirmationProps = {
      approvalRequest: {
        ...mockProps.approvalRequest,
        requestData: {
          error: 'Error message',
        },
        type: ApprovalTypes.RESULT_ERROR,
      },
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };

    const wrapper = render(<TemplateConfirmation {...errorMockProps} />);

    expect(wrapper).toMatchSnapshot();
  });
});
