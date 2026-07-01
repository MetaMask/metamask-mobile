import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { ActivityDetailsPendingBanner } from './ActivityDetailsPendingBanner';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

jest.mock('../../../UI/Money/components/PendingSpinner/PendingSpinner', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <View testID="pending-spinner" /> };
});

const submittedTx = {
  id: '1',
  status: 'submitted',
  type: TransactionType.simpleSend,
  txParams: {},
} as unknown as TransactionMeta;

const handlers = () => ({
  onSpeedUpAction: jest.fn(),
  onCancelAction: jest.fn(),
  signQRTransaction: jest.fn(),
  signLedgerTransaction: jest.fn(),
  cancelUnsignedQRTransaction: jest.fn(),
});

describe('ActivityDetailsPendingBanner', () => {
  it('renders speed up + cancel for a submitted tx and wires the handlers', () => {
    const h = handlers();
    const { getByTestId } = render(
      <ActivityDetailsPendingBanner
        tx={submittedTx}
        isQRHardwareAccount={false}
        isLedgerAccount={false}
        {...h}
      />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_BANNER),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_SPEED_UP_BUTTON),
    );
    expect(h.onSpeedUpAction).toHaveBeenCalledWith(true, submittedTx);

    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_CANCEL_BUTTON),
    );
    expect(h.onCancelAction).toHaveBeenCalledWith(true, submittedTx);
  });

  it('renders nothing when no action is applicable (e.g. bridge)', () => {
    const { queryByTestId } = render(
      <ActivityDetailsPendingBanner
        tx={{ ...submittedTx, type: TransactionType.bridge } as TransactionMeta}
        isQRHardwareAccount={false}
        isLedgerAccount={false}
        {...handlers()}
      />,
    );

    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.PENDING_BANNER),
    ).toBeNull();
  });

  it('renders the QR sign + QR cancel actions for an approved QR-hardware tx', () => {
    const h = handlers();
    const approvedTx = {
      ...submittedTx,
      status: 'approved',
    } as TransactionMeta;
    const { getByTestId, queryByTestId } = render(
      <ActivityDetailsPendingBanner
        tx={approvedTx}
        isQRHardwareAccount
        isLedgerAccount={false}
        {...h}
      />,
    );

    // Normal speed-up/cancel is not shown for a QR-hardware approved tx.
    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.PENDING_SPEED_UP_BUTTON),
    ).toBeNull();

    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_QR_SIGN_BUTTON),
    );
    expect(h.signQRTransaction).toHaveBeenCalledWith(approvedTx);

    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_QR_CANCEL_BUTTON),
    );
    expect(h.cancelUnsignedQRTransaction).toHaveBeenCalledWith(approvedTx);
  });

  it('renders the Ledger sign action for an approved Ledger tx', () => {
    const h = handlers();
    const { getByTestId, queryByTestId } = render(
      <ActivityDetailsPendingBanner
        tx={{ ...submittedTx, status: 'approved' } as TransactionMeta}
        isQRHardwareAccount={false}
        isLedgerAccount
        {...h}
      />,
    );

    expect(
      queryByTestId(ActivityDetailsSelectorsIDs.PENDING_SPEED_UP_BUTTON),
    ).toBeNull();
    fireEvent.press(
      getByTestId(ActivityDetailsSelectorsIDs.PENDING_LEDGER_SIGN_BUTTON),
    );
    expect(h.signLedgerTransaction).toHaveBeenCalledWith({ id: '1' });
  });
});
