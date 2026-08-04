import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import type {
  ActivityListItem,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { useTokensData } from '../../../hooks/useTokensData/useTokensData';
import { useActivityDetailsLendAgain } from '../hooks/useActivityDetailsLendAgain';
import { SwapDetails } from './SwapDetails';

// Capture the token the amount header receives so we can assert it was enriched
// with decimals before formatting.
let capturedSentToken: TokenAmount | undefined;
// Capture every "do it again" CTA the footer renders, so we can assert which
// verb (if any) a given activity type gets.
let mockCapturedCtas: { label: string; onPress: () => void }[] = [];

jest.mock('../../../hooks/useTokensData/useTokensData', () => ({
  useTokensData: jest.fn(() => ({})),
}));

jest.mock('../components', () => ({
  ActivityDetailsBlockExplorerButton: () => null,
  ActivityDetailsDoItAgainButton: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => {
    mockCapturedCtas.push({ label, onPress });
    return null;
  },
  ActivityDetailsFooter: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ActivityDetailsMetadata: () => null,
  ActivityDetailsFeesAndTotal: () => null,
  ActivityDetailsDualAmountHeader: ({
    sentToken,
  }: {
    sentToken?: TokenAmount;
  }) => {
    capturedSentToken = sentToken;
    return null;
  },
}));

const mockHandleDoItAgain = jest.fn();
jest.mock('../hooks/useActivityDetailsDoItAgain', () => ({
  useActivityDetailsDoItAgain: () => mockHandleDoItAgain,
  canRenderActivityDetailsDoItAgain: jest.fn(() => true),
}));

const mockOnLendAgain = jest.fn();
jest.mock('../hooks/useActivityDetailsLendAgain', () => ({
  useActivityDetailsLendAgain: jest.fn(() => ({
    canLendAgain: false,
    onLendAgain: jest.fn(),
  })),
}));
const mockUseActivityDetailsLendAgain = jest.mocked(
  useActivityDetailsLendAgain,
);

const USDT_ASSET_ID =
  'eip155:42161/erc20:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

const makeItem = (
  type: ActivityListItem['type'],
  data: Record<string, unknown>,
): ActivityListItem =>
  ({
    type,
    chainId: 'eip155:42161',
    status: 'success',
    timestamp: 1,
    hash: '0xabc',
    data,
  }) as unknown as ActivityListItem;

const makeLendingDepositItem = (sourceToken: Partial<TokenAmount>) =>
  makeItem('lendingDeposit', { sourceToken });

const arrangeLendAgain = (canLendAgain: boolean) => {
  mockUseActivityDetailsLendAgain.mockReturnValue({
    canLendAgain,
    onLendAgain: mockOnLendAgain,
  });
};

const lendingSourceToken = {
  direction: 'out',
  amount: '10000',
  assetId: USDT_ASSET_ID,
  decimals: 6,
  symbol: 'USDT',
} as TokenAmount;

describe('SwapDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedSentToken = undefined;
    mockCapturedCtas = [];
    jest.mocked(useTokensData).mockReturnValue({});
    arrangeLendAgain(false);
  });

  it('enriches the deposited token decimals from the tokens API so the amount is not rendered as raw base units', () => {
    // The adapter left `decimals` off the lending sourceToken; without
    // enrichment the amount header would format 10000 base units as "10,000"
    // instead of 0.01 USDT.
    jest.mocked(useTokensData).mockReturnValue({
      [USDT_ASSET_ID]: {
        assetId: USDT_ASSET_ID,
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
        iconUrl: '',
      },
    });

    render(
      <SwapDetails
        item={
          makeLendingDepositItem({
            direction: 'out',
            amount: '10000',
            assetId: USDT_ASSET_ID,
          }) as never
        }
      />,
    );

    expect(capturedSentToken?.decimals).toBe(6);
    expect(capturedSentToken?.symbol).toBe('USDT');
    expect(capturedSentToken?.amount).toBe('10000');
  });

  it('leaves an already-populated token unchanged (no-op when decimals are present)', () => {
    render(
      <SwapDetails
        item={makeLendingDepositItem(lendingSourceToken) as never}
      />,
    );

    expect(capturedSentToken?.decimals).toBe(6);
  });

  describe('call-to-action', () => {
    it('renders "Lend again" instead of "Swap again" for a lending deposit', () => {
      arrangeLendAgain(true);

      render(
        <SwapDetails
          item={makeLendingDepositItem(lendingSourceToken) as never}
        />,
      );

      expect(mockCapturedCtas).toHaveLength(1);
      expect(mockCapturedCtas[0].label).toBe(
        strings('activity_details.lend_again'),
      );
      expect(mockCapturedCtas[0].label).not.toBe(
        strings('activity_details.swap_again'),
      );

      mockCapturedCtas[0].onPress();
      expect(mockOnLendAgain).toHaveBeenCalled();
      expect(mockHandleDoItAgain).not.toHaveBeenCalled();
    });

    it('passes the deposited underlying token to the lend-again hook', () => {
      arrangeLendAgain(true);

      render(
        <SwapDetails
          item={makeLendingDepositItem(lendingSourceToken) as never}
        />,
      );

      expect(mockUseActivityDetailsLendAgain).toHaveBeenCalledWith({
        token: expect.objectContaining({ assetId: USDT_ASSET_ID }),
        fallbackCaipChainId: 'eip155:42161',
      });
    });

    it('renders no call-to-action for a lending deposit whose token is no longer lendable', () => {
      arrangeLendAgain(false);

      render(
        <SwapDetails
          item={makeLendingDepositItem(lendingSourceToken) as never}
        />,
      );

      expect(mockCapturedCtas).toHaveLength(0);
    });

    it('renders no call-to-action for a lending withdrawal', () => {
      // The withdrawal's source is the non-swappable aToken, so neither the
      // swap view nor the deposit flow can repeat it.
      arrangeLendAgain(true);

      render(
        <SwapDetails
          item={
            makeItem('lendingWithdrawal', {
              sourceToken: {
                direction: 'out',
                amount: '10000',
                assetId:
                  'eip155:42161/erc20:0x724dc807b04555b71ed48a6896b6f41593b8c637',
                decimals: 6,
                symbol: 'aArbUSDCn',
              },
              destinationToken: lendingSourceToken,
            }) as never
          }
        />,
      );

      expect(mockCapturedCtas).toHaveLength(0);
      expect(mockUseActivityDetailsLendAgain).toHaveBeenCalledWith({
        token: undefined,
        fallbackCaipChainId: 'eip155:42161',
      });
    });

    it.each([
      ['swap', 'activity_details.swap_again'],
      ['convert', 'activity_details.convert_again'],
      ['wrap', 'activity_details.wrap_again'],
      ['unwrap', 'activity_details.unwrap_again'],
    ] as const)('keeps the "%s" CTA unchanged', (type, labelKey) => {
      render(
        <SwapDetails
          item={
            makeItem(type, {
              sourceToken: lendingSourceToken,
              destinationToken: lendingSourceToken,
            }) as never
          }
        />,
      );

      expect(mockCapturedCtas).toHaveLength(1);
      expect(mockCapturedCtas[0].label).toBe(strings(labelKey));

      mockCapturedCtas[0].onPress();
      expect(mockHandleDoItAgain).toHaveBeenCalled();
    });
  });
});
