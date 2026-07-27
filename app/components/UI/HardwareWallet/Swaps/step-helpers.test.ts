import { IconName, IconColor } from '@metamask/design-system-react-native';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import {
  getStepTitle,
  getStepDescription,
  getStepIcon,
  getTotalQrScans,
  getDisplayScanStep,
  getCameraScanStep,
} from './step-helpers';

describe('step-helpers', () => {
  describe('getStepTitle', () => {
    it('returns approving title for waiting approval step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Waiting,
          },
          { amount: '10', tokenSymbol: 'ETH' },
        ),
      ).toBe('Approving 10 ETH');
    });

    it('returns approved title for signed approval step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Signed,
          },
          { amount: '10', tokenSymbol: 'ETH' },
        ),
      ).toBe('Approved 10 ETH');
    });

    it('returns send title for waiting transaction step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Waiting,
          },
          { amount: '5', tokenSymbol: 'USDC' },
        ),
      ).toBe('Send 5 USDC');
    });

    it('returns sending title for signing transaction step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Signing,
          },
          { amount: '5', tokenSymbol: 'USDC' },
        ),
      ).toBe('Sending 5 USDC');
    });

    it('returns sending title for rejected transaction step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Rejected,
          },
          { amount: '5', tokenSymbol: 'USDC' },
        ),
      ).toBe('Sending 5 USDC');
    });

    it('returns sent title for signed transaction step', () => {
      expect(
        getStepTitle(
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Signed,
          },
          { amount: '5', tokenSymbol: 'USDC' },
        ),
      ).toBe('Sent 5 USDC');
    });

    it('returns title with empty amount and symbol when options are omitted', () => {
      expect(
        getStepTitle({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toBe('Send  ');
    });

    describe('FeeTransfer step kind (send-only)', () => {
      it.each([
        {
          statusName: 'Waiting',
          status: HardwareWalletsSwapsStepStatus.Waiting,
          opts: { amount: '5', tokenSymbol: 'USDC' },
        },
        {
          statusName: 'Signing',
          status: HardwareWalletsSwapsStepStatus.Signing,
          opts: { tokenSymbol: 'USDC' },
        },
        {
          statusName: 'Rejected',
          status: HardwareWalletsSwapsStepStatus.Rejected,
          opts: { tokenSymbol: 'USDC' },
        },
      ])(
        'returns paying-network-fee title for $statusName fee transfer step',
        ({ status, opts }) => {
          expect(
            getStepTitle(
              {
                kind: HardwareWalletsSwapsStepKind.FeeTransfer,
                status,
              },
              opts,
            ),
          ).toBe('Paying network fee with USDC');
        },
      );

      it('returns network-fee-paid title for signed fee transfer step', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.FeeTransfer,
              status: HardwareWalletsSwapsStepStatus.Signed,
            },
            { tokenSymbol: 'USDC' },
          ),
        ).toBe('Network fee paid with USDC');
      });

      it('ignores amount in the fee transfer title (symbol-only)', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.FeeTransfer,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
            { amount: '999', tokenSymbol: 'DAI' },
          ),
        ).toBe('Paying network fee with DAI');
      });
    });
  });

  describe('getStepDescription', () => {
    it('returns rejected for rejected step', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Rejected,
        }),
      ).toBe('Rejected');
    });

    it('returns spender address for approval with address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }),
      ).toBe('Spender 0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc');
    });

    it('returns undefined for approval without address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toBeUndefined();
    });

    it('returns recipient address for transaction with address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        }),
      ).toBe('Recipient 0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    });

    it('returns undefined for transaction without address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toBeUndefined();
    });

    describe('FeeTransfer step kind (send-only)', () => {
      it.each([
        {
          name: 'with an address',
          step: {
            kind: HardwareWalletsSwapsStepKind.FeeTransfer,
            status: HardwareWalletsSwapsStepStatus.Waiting,
            address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          },
        },
        {
          name: 'without an address',
          step: {
            kind: HardwareWalletsSwapsStepKind.FeeTransfer,
            status: HardwareWalletsSwapsStepStatus.Waiting,
          },
        },
      ])('returns undefined for fee transfer $name', ({ step }) => {
        expect(getStepDescription(step)).toBeUndefined();
      });

      it('returns rejected for rejected fee transfer step', () => {
        expect(
          getStepDescription({
            kind: HardwareWalletsSwapsStepKind.FeeTransfer,
            status: HardwareWalletsSwapsStepStatus.Rejected,
          }),
        ).toBe('Rejected');
      });
    });
  });

  describe('getStepIcon', () => {
    it('returns check icon for signed step', () => {
      const result = getStepIcon(
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signed,
        },
        0,
      );
      expect(result).toEqual({
        name: IconName.Check,
        color: IconColor.SuccessDefault,
        isSigning: false,
      });
    });

    it('returns close icon for rejected step', () => {
      const result = getStepIcon(
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        0,
      );
      expect(result).toEqual({
        name: IconName.Close,
        color: IconColor.ErrorDefault,
        isSigning: false,
      });
    });

    it('returns signing spinner for signing step', () => {
      const result = getStepIcon(
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signing,
        },
        0,
      );
      expect(result).toEqual({
        isSigning: true,
      });
    });

    it('returns index label for waiting step', () => {
      const result = getStepIcon(
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        2,
      );
      expect(result).toEqual({
        label: '3',
        isSigning: false,
      });
    });
  });

  describe('QR scan-step helpers', () => {
    describe('getTotalQrScans', () => {
      it('doubles the transaction count', () => {
        expect(getTotalQrScans(1)).toBe(2);
        expect(getTotalQrScans(2)).toBe(4);
        expect(getTotalQrScans(3)).toBe(6);
      });

      it('returns 0 for zero transactions', () => {
        expect(getTotalQrScans(0)).toBe(0);
      });
    });

    describe('getDisplayScanStep', () => {
      // Display phase = odd-numbered scans (1, 3, 5, …)
      it.each([
        [0, 1],
        [1, 3],
        [2, 5],
      ])('returns scan %i for transaction step %i', (txStep, expected) => {
        expect(getDisplayScanStep(txStep)).toBe(expected);
      });
    });

    describe('getCameraScanStep', () => {
      // Camera phase = even-numbered scans (2, 4, 6, …)
      it.each([
        [0, 2],
        [1, 4],
        [2, 6],
      ])('returns scan %i for transaction step %i', (txStep, expected) => {
        expect(getCameraScanStep(txStep)).toBe(expected);
      });
    });

    it('display and camera steps interleave across a full 2-tx flow', () => {
      // 2 transactions → 4 scans: display(1) → camera(2) → display(3) → camera(4)
      expect(getDisplayScanStep(0)).toBe(1);
      expect(getCameraScanStep(0)).toBe(2);
      expect(getDisplayScanStep(1)).toBe(3);
      expect(getCameraScanStep(1)).toBe(4);
      expect(getTotalQrScans(2)).toBe(4);
    });
  });
});
