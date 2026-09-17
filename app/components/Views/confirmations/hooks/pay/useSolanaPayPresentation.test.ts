import { renderHook } from '@testing-library/react-native';
import { SolScope } from '@metamask/keyring-api';

import { useAccountTokens } from '../send/useAccountTokens';
import { useSolanaPayQuote } from './useTransactionPayData';
import { useTransactionPaySource } from './useTransactionPaySource';
import { useSolanaPayPresentation } from './useSolanaPayPresentation';

jest.mock('../send/useAccountTokens');
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPaySource');

const SOL_ASSET_ID = `${SolScope.Mainnet}/slip44:501`;
const USDC_ASSET_ID = `${SolScope.Mainnet}/token:USDCMint`;

const solAsset = {
  accountId: 'solana-account-id',
  address: SOL_ASSET_ID,
  balance: '10',
  chainId: SolScope.Mainnet,
  decimals: 9,
  fiat: { conversionRate: 100 },
  image: 'sol.png',
  isNative: true,
  name: 'Solana',
  symbol: 'SOL',
};

const usdcAsset = {
  ...solAsset,
  address: USDC_ASSET_ID,
  assetId: USDC_ASSET_ID,
  decimals: 6,
  image: 'usdc.png',
  isNative: false,
  name: 'USD Coin',
  symbol: 'USDC',
};

describe('useSolanaPayPresentation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(useAccountTokens).mockReturnValue([solAsset] as never);
    jest.mocked(useTransactionPaySource).mockReturnValue({
      isSolana: true,
      paySource: usdcAsset,
      setPaySource: jest.fn(),
      solanaAsset: usdcAsset,
      solanaExecution: undefined,
      solanaSource: {
        sourceAccountId: `${SolScope.Mainnet}:account`,
        sourceAssetId: USDC_ASSET_ID,
      },
    } as never);
    jest.mocked(useSolanaPayQuote).mockReturnValue({
      preflight: {
        affordability: {
          isAffordable: true,
          nativeShortfallRaw: '0',
          sourceShortfallRaw: '0',
        },
        rentDebitRaw: '100000',
        rentExemptionRequirementRaw: '1000000',
        retainedReserveRaw: '1600000',
        totalFeeRaw: '500000',
      },
      providerQuote: {
        details: {
          currencyIn: {
            amountFormatted: '25',
            amountUsd: '25',
          },
        },
        fees: {
          app: { amountUsd: '0.10' },
          relayer: { amountUsd: '0.20' },
        },
      },
    } as never);
  });

  it('combines provider and finalized Solana fees for confirmation totals', () => {
    const { result } = renderHook(useSolanaPayPresentation);

    expect(result.current?.feeUsd.toFixed(2)).toBe('0.36');
    expect(result.current?.reserveSol.toFixed(3)).toBe('0.001');
    expect(result.current?.sourceAmountFormatted).toBe('25');
    expect(result.current?.totalUsd.toFixed(2)).toBe('25.36');
  });
});
