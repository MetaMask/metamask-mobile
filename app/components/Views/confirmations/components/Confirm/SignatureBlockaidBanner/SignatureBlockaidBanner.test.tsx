import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  securityAlertResponse,
  typedSignV1ConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import SignatureBlockaidBanner from './index';
import { DecodingDataChangeType, MessageParamsTyped } from '@metamask/signature-controller';
import { Hex } from '@metamask/utils';

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilderAddProperties = jest.fn();

jest.mock('../../../hooks/useTypedSignSimulationEnabled', () => ({
  useTypedSignSimulationEnabled: () => true,
}));

jest.mock('../../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: mockCreateEventBuilderAddProperties.mockReturnValue({
        build: () => ({}),
      }),
    }),
  }),
}));

jest.mock('../../../../../../util/confirmation/signatureUtils', () => ({
  getAnalyticsParams: () => ({}),
}));

const typedSignApproval =
  typedSignV1ConfirmationState.engine.backgroundState.ApprovalController
    .pendingApprovals['7e62bcb1-a4e9-11ef-9b51-ddf21c91a998'];
const typedSignV1ConfirmationStateWithBlockaidResponse = {
  engine: {
    ...typedSignV1ConfirmationState.engine,
    backgroundState: {
      ...typedSignV1ConfirmationState.engine.backgroundState,
      ApprovalController: {
        pendingApprovals: {
          '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998': {
            ...typedSignApproval,
            requestData: {
              ...typedSignApproval.requestData,
              securityAlertResponse,
            },
            decodingData: {
              stateChanges: [
                {
                  assetType: 'ERC20',
                  changeType: DecodingDataChangeType.Approve,
                  address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
                  amount: '12345',
                  contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                },
              ],
              decodingLoading: false,
              error: undefined,
            },
          },
        },
      },
      SignatureController: {
        signatureRequests: {
          '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998': {
            chainId: '0x1' as Hex,
            messageParams: {
              ...typedSignApproval.requestData,
            } as MessageParamsTyped,
            decodingData: {
              stateChanges: [
                {
                  assetType: 'ERC20',
                  changeType: DecodingDataChangeType.Approve,
                  address: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad',
                  amount: '12345',
                  contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
                },
              ],
              error: undefined,
            },
          },
        },
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: true,
          },
        },
      },
    },
  },
};

describe('Confirm', () => {
  it('should return null if request does not have securityAlertResponse', async () => {
    const { queryByText } = renderWithProvider(<SignatureBlockaidBanner />, {
      state: typedSignV1ConfirmationState,
    });
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('should render blockaid banner alert if blockaid returns error', async () => {
    const { getByText } = renderWithProvider(<SignatureBlockaidBanner />, {
      state: typedSignV1ConfirmationStateWithBlockaidResponse,
    });
    expect(getByText('This is a deceptive request')).toBeDefined();
  });

  it('should call trackMetrics method when report issue link is clicked', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SignatureBlockaidBanner />,
      {
        state: typedSignV1ConfirmationStateWithBlockaidResponse,
      },
    );

    fireEvent.press(getByTestId('accordionheader'));
    fireEvent.press(getByText('Report an issue'));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockCreateEventBuilderAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        decoding_change_types: ['APPROVE'],
        decoding_description: null,
        decoding_response: 'CHANGE',
        external_link_clicked: 'security_alert_support_link',
      }),
    );
  });
});
