import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  securityAlertResponse,
  typedSignV1ConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import SignatureBlockaidBanner from './index';

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
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
          'fb2029e1-b0ab-11ef-9227-05a11087c334': {
            ...typedSignApproval,
            requestData: {
              ...typedSignApproval.requestData,
              securityAlertResponse,
            },
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
  });
});
