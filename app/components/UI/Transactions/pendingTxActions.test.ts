import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  getPendingTxActionVisibility,
  hasAnyPendingTxAction,
} from './pendingTxActions';

const baseTx = {
  id: '1',
  status: 'submitted',
  type: TransactionType.simpleSend,
  txParams: {},
} as unknown as TransactionMeta;

const noHardware = { isQRHardwareAccount: false, isLedgerAccount: false };

describe('getPendingTxActionVisibility', () => {
  it('shows speed up + cancel for a submitted tx', () => {
    const v = getPendingTxActionVisibility(baseTx, noHardware);
    expect(v).toStrictEqual({
      showSpeedUpCancel: true,
      showQRSign: false,
      showLedgerSign: false,
    });
  });

  it('shows speed up + cancel for an approved non-hardware tx', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, status: 'approved' } as TransactionMeta,
      noHardware,
    );
    expect(v.showSpeedUpCancel).toBe(true);
  });

  it('hides normal actions for a bridge tx', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, type: TransactionType.bridge } as TransactionMeta,
      noHardware,
    );
    expect(v.showSpeedUpCancel).toBe(false);
  });

  it('hides normal actions for a smart transaction', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, isSmartTransaction: true } as TransactionMeta,
      noHardware,
    );
    expect(v.showSpeedUpCancel).toBe(false);
  });

  it('hides normal actions when a gas fee token is selected', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, selectedGasFeeToken: '0xtoken' } as TransactionMeta,
      noHardware,
    );
    expect(v.showSpeedUpCancel).toBe(false);
  });

  it('shows QR sign for an approved QR-hardware tx (not normal actions)', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, status: 'approved' } as TransactionMeta,
      { isQRHardwareAccount: true, isLedgerAccount: false },
    );
    expect(v).toStrictEqual({
      showSpeedUpCancel: false,
      showQRSign: true,
      showLedgerSign: false,
    });
  });

  it('shows Ledger sign for an approved Ledger tx', () => {
    const v = getPendingTxActionVisibility(
      { ...baseTx, status: 'approved' } as TransactionMeta,
      { isQRHardwareAccount: false, isLedgerAccount: true },
    );
    expect(v).toStrictEqual({
      showSpeedUpCancel: false,
      showQRSign: false,
      showLedgerSign: true,
    });
  });

  it.each(['unapproved', 'signed', 'confirmed', 'failed', 'dropped'])(
    'hides all actions for a non-actionable status: %s',
    (status) => {
      const v = getPendingTxActionVisibility(
        { ...baseTx, status } as unknown as TransactionMeta,
        { isQRHardwareAccount: true, isLedgerAccount: false },
      );
      expect(hasAnyPendingTxAction(v)).toBe(false);
    },
  );
});
