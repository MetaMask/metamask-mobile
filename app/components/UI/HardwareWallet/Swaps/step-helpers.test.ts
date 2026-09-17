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
    // Extension parity: 'Approve' for pending, active, AND rejected approval
    // steps — only Signed gets 'Approved'.
    it.each([
      ['Waiting', HardwareWalletsSwapsStepStatus.Waiting],
      ['Signing', HardwareWalletsSwapsStepStatus.Signing],
      ['Rejected', HardwareWalletsSwapsStepStatus.Rejected],
    ] as const)(
      'returns approve title for %s approval step (extension parity)',
      (_statusName, status) => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Approval,
              status,
            },
            { amount: '10', tokenSymbol: 'ETH' },
          ),
        ).toBe('Approve 10 ETH');
      },
    );

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

    describe('same-chain swap copy (Transaction step)', () => {
      const swapOptions = {
        amount: '5',
        tokenSymbol: 'USDC',
        destAmount: '5.2',
        destTokenSymbol: 'DAI',
      };

      it('returns swap title for waiting transaction step with dest data', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
            swapOptions,
          ),
        ).toBe('Swap 5 USDC for 5.2 DAI');
      });

      it('returns swapping title for signing transaction step with dest data', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signing,
            },
            swapOptions,
          ),
        ).toBe('Swapping 5 USDC for 5.2 DAI');
      });

      it('returns swapping title for rejected transaction step with dest data', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Rejected,
            },
            swapOptions,
          ),
        ).toBe('Swapping 5 USDC for 5.2 DAI');
      });

      it('returns swapped title for signed transaction step with dest data', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
            },
            swapOptions,
          ),
        ).toBe('Swapped 5 USDC for 5.2 DAI');
      });

      it('falls back to send title when destAmount is missing', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
            { amount: '5', tokenSymbol: 'USDC', destTokenSymbol: 'DAI' },
          ),
        ).toBe('Send 5 USDC');
      });

      it('falls back to sent title when destTokenSymbol is missing', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
            },
            { amount: '5', tokenSymbol: 'USDC', destAmount: '5.2' },
          ),
        ).toBe('Sent 5 USDC');
      });

      it('ignores dest options for approval steps (still approve copy)', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
            },
            swapOptions,
          ),
        ).toBe('Approved 5 USDC');
      });

      it('ignores dest options for fee transfer steps (still fee copy)', () => {
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.FeeTransfer,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
            swapOptions,
          ),
        ).toBe('Paying network fee with USDC');
        expect(
          getStepTitle(
            {
              kind: HardwareWalletsSwapsStepKind.FeeTransfer,
              status: HardwareWalletsSwapsStepStatus.Signed,
            },
            swapOptions,
          ),
        ).toBe('Network fee paid with USDC');
      });
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
    it('returns a single rejected line for rejected step', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Rejected,
        }),
      ).toEqual(['Rejected']);
    });

    it('returns shortened token and spender lines for approval with both addresses', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          tokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }),
      ).toEqual(['Token: 0x90F79...3b906', 'Spender: 0x3c44C...C6cDc']);
    });

    it('returns only the shortened spender line for approval with only a spender', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        }),
      ).toEqual(['Spender: 0x3c44C...C6cDc']);
    });

    it('returns no lines for approval without addresses', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toEqual([]);
    });

    it('returns a shortened recipient line for transaction with address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        }),
      ).toEqual(['To: 0x70997...c79C8']);
    });

    it('returns no lines for transaction without address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toEqual([]);
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
      ])('returns no lines for fee transfer $name', ({ step }) => {
        expect(getStepDescription(step)).toEqual([]);
      });

      it('returns a single rejected line for rejected fee transfer step', () => {
        expect(
          getStepDescription({
            kind: HardwareWalletsSwapsStepKind.FeeTransfer,
            status: HardwareWalletsSwapsStepStatus.Rejected,
          }),
        ).toEqual(['Rejected']);
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
