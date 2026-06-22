import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  typedSignV3ConfirmationState,
  typedSignV4ConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import { InfoSectionOriginAndDetails } from './info-section-origin-and-details';

describe('InfoSectionOriginAndDetails', () => {
  it('renders origin', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Request from')).toBeTruthy();
    expect(getByText('metamask.github.io')).toBeTruthy();
  });

  it('renders the dapp url from request metadata instead of approvalRequest.origin (e.g. WalletConnect pairing topic)', () => {
    const approvalController =
      typedSignV4ConfirmationState.engine.backgroundState.ApprovalController;
    const [approvalId, approval] = Object.entries(
      approvalController.pendingApprovals,
    )[0];
    const pairingTopic =
      'a7c9f3e1b8d6c2f4e9a1b3d5c7e9f1a3a7c9f3e1b8d6c2f4e9a1b3d5c7e9f1a3';

    const walletConnectState = {
      ...typedSignV4ConfirmationState,
      engine: {
        ...typedSignV4ConfirmationState.engine,
        backgroundState: {
          ...typedSignV4ConfirmationState.engine.backgroundState,
          ApprovalController: {
            ...approvalController,
            pendingApprovals: {
              [approvalId]: {
                ...approval,
                origin: pairingTopic,
              },
            },
          },
        },
      },
    };

    const { getByText, queryByText } = renderWithProvider(
      <InfoSectionOriginAndDetails />,
      {
        state: walletConnectState,
      },
    );

    expect(getByText('metamask.github.io')).toBeTruthy();
    expect(queryByText(pairingTopic)).toBeNull();
  });

  it('renders network', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Network')).toBeTruthy();
  });

  it('renders "Interacting with" if associated with a valid verifying contract', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Request from')).toBeTruthy();
  });

  it('renders Spender if it is a Permit', () => {
    const { getByText } = renderWithProvider(<InfoSectionOriginAndDetails />, {
      state: typedSignV4ConfirmationState,
    });

    expect(getByText('Interacting with')).toBeTruthy();
    expect(getByText('0xCcCCc...ccccC')).toBeTruthy();
  });

  it('does not render Spender if it is not a Permit', () => {
    const { queryByText } = renderWithProvider(
      <InfoSectionOriginAndDetails />,
      {
        state: typedSignV3ConfirmationState,
      },
    );

    expect(queryByText('Spender')).toBeNull();
  });
});
