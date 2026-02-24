import React from 'react';
import { merge } from 'lodash';
import { TransactionType } from '@metamask/transaction-controller';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import { useConfirmationMetricEvents } from '../../../../hooks/metrics/useConfirmationMetricEvents';
import useDisplayName, {
  DisplayNameVariant,
  TrustSignalDisplayState,
} from '../../../../../../hooks/DisplayName/useDisplayName';
import FromToRow from './from-to-row';

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents');
jest.mock('../../../../../../hooks/DisplayName/useDisplayName', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../../../hooks/DisplayName/useDisplayName'),
  default: jest.fn(),
}));

const mockUseDisplayName = jest.mocked(useDisplayName);
jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

const nativeTransferState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.simpleSend,
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              to: '0x97cb1fdd071da9960d38306c07f146bc98b21231',
            },
          },
        ],
      },
    },
  },
});

const erc20TransferState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            type: TransactionType.tokenMethodTransfer,
            txParams: {
              data: '0xa9059cbb00000000000000000000000097cb1fdd071da9960d38306c07f146bc98b2d31700000000000000000000000000000000000000000000000000000000000f4240',
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
          },
        ],
      },
    },
  },
});

describe('FromToRow', () => {
  const useConfirmationMetricEventsMock = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockTrackTooltipClickedEvent = jest.fn();

  beforeEach(() => {
    useConfirmationMetricEventsMock.mockReturnValue({
      trackTooltipClickedEvent: mockTrackTooltipClickedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);

    mockUseDisplayName.mockImplementation(
      jest.requireActual('../../../../../../hooks/DisplayName/useDisplayName')
        .default,
    );
  });

  it('displays the correct addresses for native transfer', async () => {
    const { getByText } = renderWithProvider(<FromToRow />, {
      state: nativeTransferState,
    });

    expect(getByText('From')).toBeOnTheScreen();
    expect(getByText('To')).toBeOnTheScreen();
    expect(getByText(/^0xDc47789/)).toBeOnTheScreen();
    expect(getByText(/^0x97Cb1/)).toBeOnTheScreen();
  });

  it('displays the correct addresses for erc20 transfer', async () => {
    const { getByText } = renderWithProvider(<FromToRow />, {
      state: erc20TransferState,
    });

    expect(getByText('From')).toBeOnTheScreen();
    expect(getByText('To')).toBeOnTheScreen();
    expect(getByText(/^0xDc47789/)).toBeOnTheScreen();
    expect(getByText(/^0x97cb1/)).toBeOnTheScreen();
  });

  it('displays wallet name next to labels when subtitle is returned', async () => {
    mockUseDisplayName.mockReturnValue({
      variant: DisplayNameVariant.Saved,
      name: 'Account 1',
      subtitle: 'Wallet 1',
      displayState: TrustSignalDisplayState.Petname,
      icon: null,
      isAccount: true,
    });

    const { getByText } = renderWithProvider(<FromToRow />, {
      state: nativeTransferState,
    });

    expect(getByText('From Wallet 1')).toBeOnTheScreen();
    expect(getByText('To Wallet 1')).toBeOnTheScreen();
  });

  it('displays plain labels when subtitle is undefined', async () => {
    mockUseDisplayName.mockReturnValue({
      variant: DisplayNameVariant.Unknown,
      name: undefined,
      subtitle: undefined,
      displayState: TrustSignalDisplayState.Unknown,
      icon: null,
      isAccount: false,
    });

    const { getByText, queryByText } = renderWithProvider(<FromToRow />, {
      state: nativeTransferState,
    });

    expect(getByText('From')).toBeOnTheScreen();
    expect(getByText('To')).toBeOnTheScreen();
    expect(queryByText(/Wallet/)).not.toBeOnTheScreen();
  });
});
