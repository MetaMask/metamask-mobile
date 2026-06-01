import { IconName, IconColor } from '@metamask/design-system-react-native';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { getStepTitle, getStepDescription, getStepIcon } from './step-helpers';

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
          address: '0xABC',
        }),
      ).toBe('Spender 0xABC');
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
          address: '0xDEF',
        }),
      ).toBe('Recipient 0xDEF');
    });

    it('returns undefined for transaction without address', () => {
      expect(
        getStepDescription({
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        }),
      ).toBeUndefined();
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
        label: undefined,
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
        label: undefined,
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
        name: undefined,
        color: undefined,
        label: undefined,
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
        name: undefined,
        color: undefined,
        label: '3',
        isSigning: false,
      });
    });
  });
});
