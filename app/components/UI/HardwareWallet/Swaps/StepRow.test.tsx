import React from 'react';
import { render } from '@testing-library/react-native';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { StepRow } from './StepRow';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';

jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');

  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'bridge.hardware_wallet_progress.send_token') {
      return `Send ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.sending_token') {
      return `Sending ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.sent_token') {
      return `Sent ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.approving_token') {
      return `Approving ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.spender_address') {
      return `Spender ${params?.address}`;
    }
    if (key === 'bridge.hardware_wallet_progress.recipient_address') {
      return `Recipient ${params?.address}`;
    }
    if (key === 'bridge.hardware_wallet_progress.rejected') {
      return 'Rejected';
    }
    return key;
  }),
}));

jest.mock('../../QRHardware/AnimatedQRCode', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./StepConnectorLine', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    StepConnectorLine: jest.fn(({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    ),
  };
});

import AnimatedQRCode from '../../QRHardware/AnimatedQRCode';

const mockAnimatedQRCode = AnimatedQRCode as jest.Mock;

describe('StepRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a waiting step with index label and connector', () => {
    const { getByText, getByTestId } = render(
      <StepRow
        index={0}
        isLast={false}
        amount="10"
        tokenSymbol="ETH"
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }}
      />,
    );

    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-0`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR}-0`),
    ).toBeOnTheScreen();
    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('Send 10 ETH')).toBeOnTheScreen();
  });

  it('does not render a connector for the last step', () => {
    const { queryByTestId } = render(
      <StepRow
        index={0}
        isLast
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }}
      />,
    );

    expect(
      queryByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_CONNECTOR}-0`),
    ).toBeNull();
  });

  it('renders a signing spinner and inline QR code for QR wallet signing requests', () => {
    const pendingScanRequest = {
      type: QrScanRequestType.SIGN,
      request: {
        requestId: 'request-id',
        payload: {
          type: 'eth-sign-request',
          cbor: 'aabbccdd',
        },
      },
    };

    const { getByTestId, getByText } = render(
      <StepRow
        index={1}
        isLast
        isQrWallet
        pendingScanRequest={pendingScanRequest}
        amount="5"
        tokenSymbol="USDC"
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signing,
          address: '0xRecipient',
        }}
      />,
    );

    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.SIGNING_SPINNER}-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.INLINE_QR_CODE}-1`),
    ).toBeOnTheScreen();
    expect(getByText('Recipient 0xRecipient')).toBeOnTheScreen();
    expect(mockAnimatedQRCode).toHaveBeenCalledWith(
      expect.objectContaining({
        cbor: 'aabbccdd',
        type: 'eth-sign-request',
        shouldPause: false,
        size: 240,
      }),
      {},
    );
  });

  it('does not render inline QR code when signing without a QR wallet request', () => {
    const { queryByTestId } = render(
      <StepRow
        index={0}
        isLast
        isQrWallet={false}
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signing,
        }}
      />,
    );

    expect(
      queryByTestId(`${HardwareWalletsSwapsSelectorsIDs.INLINE_QR_CODE}-0`),
    ).toBeNull();
  });

  it('renders rejected description for rejected steps', () => {
    const { getByText } = render(
      <StepRow
        index={0}
        isLast
        amount="10"
        tokenSymbol="ETH"
        step={{
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Rejected,
          address: '0xSpender',
        }}
      />,
    );

    expect(getByText('Approving 10 ETH')).toBeOnTheScreen();
    expect(getByText('Rejected')).toBeOnTheScreen();
  });

  it('renders approval spender descriptions', () => {
    const { getByText } = render(
      <StepRow
        index={0}
        isLast
        amount="10"
        tokenSymbol="ETH"
        step={{
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0xSpender',
        }}
      />,
    );

    expect(getByText('Approving 10 ETH')).toBeOnTheScreen();
    expect(getByText('Spender 0xSpender')).toBeOnTheScreen();
  });
});
