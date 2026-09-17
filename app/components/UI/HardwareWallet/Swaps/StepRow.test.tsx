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
    if (key === 'bridge.hardware_wallet_progress.swap_amount') {
      return `Swap ${params?.amount ?? ''} ${
        params?.symbol ?? ''
      } for ${params?.destAmount ?? ''} ${params?.destSymbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.swapping_amount') {
      return `Swapping ${params?.amount ?? ''} ${
        params?.symbol ?? ''
      } for ${params?.destAmount ?? ''} ${params?.destSymbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.swapped_amount') {
      return `Swapped ${params?.amount ?? ''} ${
        params?.symbol ?? ''
      } for ${params?.destAmount ?? ''} ${params?.destSymbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.approve_token') {
      return `Approve ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.approved_token') {
      return `Approved ${params?.amount ?? ''} ${params?.symbol ?? ''}`;
    }
    if (key === 'bridge.hardware_wallet_progress.spender_address') {
      return `Spender: ${params?.address}`;
    }
    if (key === 'bridge.hardware_wallet_progress.token_address') {
      return `Token: ${params?.address}`;
    }
    if (key === 'bridge.hardware_wallet_progress.recipient_address') {
      return `To: ${params?.address}`;
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

  it('renders the swap title for a transaction step with destination data', () => {
    const { getByText, queryByText } = render(
      <StepRow
        index={0}
        isLast
        amount="5"
        tokenSymbol="USDC"
        destAmount="5.2"
        destTokenSymbol="DAI"
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signing,
        }}
      />,
    );

    expect(getByText('Swapping 5 USDC for 5.2 DAI')).toBeOnTheScreen();
    expect(queryByText(/Sending/)).toBeNull();
  });

  it('renders the send title for a transaction step without destination data (regression)', () => {
    const { getByText, queryByText } = render(
      <StepRow
        index={0}
        isLast
        amount="5"
        tokenSymbol="USDC"
        destAmount="5.2"
        step={{
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }}
      />,
    );

    expect(getByText('Send 5 USDC')).toBeOnTheScreen();
    expect(queryByText(/Swap/)).toBeNull();
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
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        }}
      />,
    );

    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.SIGNING_SPINNER}-1`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.INLINE_QR_CODE}-1`),
    ).toBeOnTheScreen();
    expect(getByText('To: 0x70997...c79C8')).toBeOnTheScreen();
    expect(mockAnimatedQRCode).toHaveBeenCalledWith(
      expect.objectContaining({
        cbor: 'aabbccdd',
        type: 'eth-sign-request',
        shouldPause: false,
        size: 240,
      }),
      undefined,
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
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }}
      />,
    );

    expect(getByText('Approve 10 ETH')).toBeOnTheScreen();
    expect(getByText('Rejected')).toBeOnTheScreen();
  });

  it('renders approval spender description (shortened)', () => {
    const { getByText } = render(
      <StepRow
        index={0}
        isLast
        amount="10"
        tokenSymbol="ETH"
        step={{
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }}
      />,
    );

    expect(getByText('Approve 10 ETH')).toBeOnTheScreen();
    expect(getByText('Spender: 0x3c44C...C6cDc')).toBeOnTheScreen();
  });

  it('renders both token and spender description lines for an approval with both addresses', () => {
    const { getByText } = render(
      <StepRow
        index={0}
        isLast
        amount="10"
        tokenSymbol="ETH"
        step={{
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          tokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }}
      />,
    );

    expect(getByText('Approve 10 ETH')).toBeOnTheScreen();
    expect(getByText('Token: 0x90F79...3b906')).toBeOnTheScreen();
    expect(getByText('Spender: 0x3c44C...C6cDc')).toBeOnTheScreen();
  });
});
