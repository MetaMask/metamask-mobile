import React from 'react';
import { ViewProps } from 'react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import QRSigningModal, { QR_SIGNING_MODAL_CONTENT_TEST_ID } from './index';
import {
  type QrScanRequest,
  QrScanRequestType,
} from '@metamask/eth-qr-keyring';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RootState } from '../../../../reducers';

const MOCK_ELEVATED_SURFACE_COLOR = 'mock-elevated-surface-color';

jest.mock('../../../../util/theme/themeUtils', () => ({
  getElevatedSurfaceColor: jest.fn(() => MOCK_ELEVATED_SURFACE_COLOR),
}));

jest.mock('../QRSigningDetails', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return function MockQRSigningDetails(props: ViewProps) {
    return <MockView testID="QRSigningDetails" {...props} />;
  };
});

jest.mock('react-native-modal', () => {
  const ReactMock = jest.requireActual('react');
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isVisible,
      children,
    }: {
      isVisible: boolean;
      children: React.ReactNode;
    }) =>
      isVisible
        ? ReactMock.createElement(MockView, { testID: 'modal' }, children)
        : null,
  };
});

describe('QRSigningModal', () => {
  const mockPendingScanRequest: QrScanRequest = {
    type: QrScanRequestType.SIGN,
    request: {
      requestId: 'req-123',
      payload: {
        type: 'transaction',
        cbor: 'test-cbor-data',
      },
    },
  };

  const mockSelectedAccount: InternalAccount = {
    address: '0x0987654321098765432109876543210987654321',
    id: 'account-1',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: 'QR Hardware Wallet',
      },
      importTime: 0,
      lastSelected: 0,
    },
    scopes: [],
    options: {},
    methods: [],
    type: 'eip155:eoa',
  };

  const initialState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: { 'account-1': mockSelectedAccount },
            selectedAccount: 'account-1',
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content when visible', () => {
    const { getByTestId } = renderWithProvider(
      <QRSigningModal isVisible pendingScanRequest={mockPendingScanRequest} />,
      { state: initialState },
    );

    expect(getByTestId('QRSigningDetails')).toBeOnTheScreen();
  });

  it('does not render content when not visible', () => {
    const { queryByTestId } = renderWithProvider(
      <QRSigningModal
        isVisible={false}
        pendingScanRequest={mockPendingScanRequest}
      />,
      { state: initialState },
    );

    expect(queryByTestId('QRSigningDetails')).toBeNull();
  });

  it('uses the elevated surface color for the modal content background', () => {
    const { getByTestId } = renderWithProvider(
      <QRSigningModal isVisible pendingScanRequest={mockPendingScanRequest} />,
      { state: initialState },
    );

    expect(getByTestId(QR_SIGNING_MODAL_CONTENT_TEST_ID)).toHaveStyle({
      backgroundColor: MOCK_ELEVATED_SURFACE_COLOR,
    });
  });

  it('passes the selected account address to QRSigningDetails', () => {
    const { getByTestId } = renderWithProvider(
      <QRSigningModal isVisible pendingScanRequest={mockPendingScanRequest} />,
      { state: initialState },
    );

    expect(getByTestId('QRSigningDetails').props.fromAddress).toBe(
      mockSelectedAccount.address,
    );
  });
});
