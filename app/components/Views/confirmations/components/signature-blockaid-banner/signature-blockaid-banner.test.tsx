import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  securityAlertResponse,
  typedSignV1ConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import SignatureBlockaidBanner from './signature-blockaid-banner';

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilderAddProperties = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: mockCreateEventBuilderAddProperties.mockReturnValue({
        build: () => ({}),
      }),
    }),
  }),
}));

jest.mock('../../../../../util/confirmation/signatureUtils', () => ({
  getAnalyticsParams: () => ({}),
}));

// Signature ID from typedSignV1ConfirmationState
const TYPED_SIGN_V1_SIGNATURE_ID = '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998';

const typedSignV1ConfirmationStateWithBlockaidResponse = {
  ...typedSignV1ConfirmationState,
  engine: {
    ...typedSignV1ConfirmationState.engine,
    backgroundState: {
      ...typedSignV1ConfirmationState.engine.backgroundState,
      SignatureController: {
        signatureRequests: {
          [TYPED_SIGN_V1_SIGNATURE_ID]: {
            ...typedSignV1ConfirmationState.engine.backgroundState
              .SignatureController.signatureRequests[
              TYPED_SIGN_V1_SIGNATURE_ID
            ],
            id: TYPED_SIGN_V1_SIGNATURE_ID, // Add the id field
          },
        },
      },
    },
  },
  securityAlerts: {
    alerts: {
      [TYPED_SIGN_V1_SIGNATURE_ID]: securityAlertResponse,
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
        external_link_clicked: 'security_alert_support_link',
      }),
    );
  });
});
