import React from 'react';
import { merge } from 'lodash';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  typedSignV3ConfirmationState,
  typedSignV4ConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import AppConstants from '../../../../../../../core/AppConstants';
import { InfoSectionOriginAndDetails } from './info-section-origin-and-details';

// A bare connection UUID, as surfaced by MetaMask SDK (v1 channel id) and
// MetaMask Connect / MWP (v2 connection id) for the request origin.
const SDK_CONNECTION_UUID = 'a5ee1643-3832-4f04-9929-2dd008a36172';

// Override the origin (and optionally the transport `request_source`) on the
// pending typed-sign V4 request. The id matches the pending approval /
// signature request keys in typedSignV4ConfirmationState.
const typedSignV4OriginState = (origin: string, requestSource?: string) =>
  merge({}, typedSignV4ConfirmationState, {
    engine: {
      backgroundState: {
        ApprovalController: {
          pendingApprovals: {
            'fb2029e1-b0ab-11ef-9227-05a11087c334': { origin },
          },
        },
        SignatureController: {
          signatureRequests: {
            'fb2029e1-b0ab-11ef-9227-05a11087c334': {
              messageParams: {
                origin,
                ...(requestSource
                  ? { meta: { analytics: { request_source: requestSource } } }
                  : {}),
              },
            },
          },
        },
      },
    },
  });

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

  // The "Request from" row must never present an unverifiable origin as if it
  // were verified — same handling as OriginRow / NetworkAndOriginRow.
  describe('unverifiable origins', () => {
    it('displays "External app" instead of a bare SDK / MWP connection UUID origin', () => {
      const { getByText, queryByText } = renderWithProvider(
        <InfoSectionOriginAndDetails />,
        { state: typedSignV4OriginState(SDK_CONNECTION_UUID) },
      );

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(queryByText(SDK_CONNECTION_UUID)).not.toBeOnTheScreen();
    });

    it('displays "External app" instead of a deeplink origin', () => {
      const { getByText, queryByText } = renderWithProvider(
        <InfoSectionOriginAndDetails />,
        {
          state: typedSignV4OriginState(AppConstants.DEEPLINKS.ORIGIN_DEEPLINK),
        },
      );

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(
        queryByText(AppConstants.DEEPLINKS.ORIGIN_DEEPLINK),
      ).not.toBeOnTheScreen();
    });

    // The self-reported domain must NOT be shown for remote transports whose
    // origin we can't verify — the `request_source` tells us the request
    // arrived over SDK v1 / MWP / WalletConnect.
    it.each([
      ['SDK v1', AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN],
      ['MetaMask Connect (MWP)', AppConstants.REQUEST_SOURCES.MM_CONNECT],
      ['WalletConnect', AppConstants.REQUEST_SOURCES.WC],
    ])(
      'displays "External app" for a self-reported %s domain origin',
      (_label, requestSource) => {
        const selfReportedDomain = 'opensea.io';
        const { getByText, queryByText } = renderWithProvider(
          <InfoSectionOriginAndDetails />,
          { state: typedSignV4OriginState(selfReportedDomain, requestSource) },
        );

        expect(getByText('Request from')).toBeOnTheScreen();
        expect(getByText('External app')).toBeOnTheScreen();
        expect(queryByText(selfReportedDomain)).not.toBeOnTheScreen();
      },
    );

    it('still displays the verified domain for in-app browser requests', () => {
      const { getByText, queryByText } = renderWithProvider(
        <InfoSectionOriginAndDetails />,
        { state: typedSignV4ConfirmationState },
      );

      expect(getByText('metamask.github.io')).toBeOnTheScreen();
      expect(queryByText('External app')).not.toBeOnTheScreen();
    });
  });
});
