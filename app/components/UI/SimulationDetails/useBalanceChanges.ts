import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import {
  SimulationBalanceChange,
  SimulationData,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';
import {
  ContractExchangeRates,
  fetchTokenContractExchangeRates,
  CodefiTokenPricesServiceV2,
} from '@metamask/assets-controllers';

import {
  BalanceChange,
  TokenAssetIdentifier,
  AssetType,
  FIAT_UNAVAILABLE,
  NativeAssetIdentifier,
} from './types';
import { getTokenDetails } from '../../../util/address';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { useAsyncResultOrThrow } from '../../hooks/useAsyncResult';
import { RootState } from '../../../reducers';

const NATIVE_DECIMALS = 18;

const ERC20_DEFAULT_DECIMALS = 18;

// Converts a SimulationTokenStandard to a TokenStandard
function convertStandard(standard: SimulationTokenStandard) {
  switch (standard) {
    case SimulationTokenStandard.erc20:
      return AssetType.ERC20;
    case SimulationTokenStandard.erc721:
      return AssetType.ERC721;
    case SimulationTokenStandard.erc1155:
      return AssetType.ERC1155;
    default:
      throw new Error(`Unknown token standard: ${standard}`);
  }
}

// Calculates the asset amount based on the balance change and decimals
function getAssetAmount(
  { isDecrease: isNegative, difference: quantity }: SimulationBalanceChange,
  decimals: number,
): BigNumber {
  return (
    new BigNumber(quantity, 16)
      .times(isNegative ? -1 : 1)
      // Shift the decimal point to the left by the number of decimals.
      .shiftedBy(-decimals)
  );
}

// Fetches the decimals for the given token address.
async function fetchErc20Decimals(address: Hex): Promise<number> {
  try {
    const { decimals } = await getTokenDetails(address);
    return decimals ? parseInt(decimals, 10) : ERC20_DEFAULT_DECIMALS;
  } catch {
    return ERC20_DEFAULT_DECIMALS;
  }
}

// Fetches token details for all the token addresses in the SimulationTokenBalanceChanges
async function fetchAllErc20Decimals(
  addresses: Hex[],
): Promise<Record<Hex, number>> {
  const uniqueAddresses = [
    ...new Set(addresses.map((address) => address.toLowerCase() as Hex)),
  ];
  const allDecimals = await Promise.all(
    uniqueAddresses.map(fetchErc20Decimals),
  );
  return Object.fromEntries(
    allDecimals.map((decimals, i) => [uniqueAddresses[i], decimals]),
  );
}

/**
 * Retrieves token prices
 *
 * @param {string} nativeCurrency - native currency to fetch prices for.
 * @param {Hex[]} tokenAddresses - set of contract addresses
 * @param {Hex} chainId - current chainId
 * @returns The prices for the requested tokens.
 */
const fetchTokenExchangeRates = async (
  nativeCurrency: string,
  tokenAddresses: Hex[],
  chainId: Hex,
) => {
  try {
    return await fetchTokenContractExchangeRates({
      tokenPricesService: new CodefiTokenPricesServiceV2(),
      nativeCurrency,
      tokenAddresses,
      chainId,
    });
  } catch (err) {
    return {};
  }
};

async function fetchTokenFiatRates(
  fiatCurrency: string,
  erc20TokenAddresses: Hex[],
  chainId: Hex,
): Promise<ContractExchangeRates> {
  const tokenRates = await fetchTokenExchangeRates(
    fiatCurrency,
    erc20TokenAddresses,
    chainId,
  );

  return Object.fromEntries(
    Object.entries(tokenRates).map(([address, rate]) => [
      address.toLowerCase(),
      rate,
    ]),
  );
}

// Compiles the balance change for the native asset
function getNativeBalanceChange(
  nativeBalanceChange: SimulationBalanceChange | undefined,
  nativeFiatRate: number,
  chainId: Hex,
): BalanceChange | undefined {
  if (!nativeBalanceChange) {
    return undefined;
  }

  const asset: NativeAssetIdentifier = {
    type: AssetType.Native,
    chainId,
  };

  const amount = getAssetAmount(nativeBalanceChange, NATIVE_DECIMALS);
  const fiatAmount = amount.times(nativeFiatRate).toNumber();

  return { asset, amount, fiatAmount };
}

// Compiles the balance changes for token assets
function getTokenBalanceChanges(
  tokenBalanceChanges: SimulationTokenBalanceChange[],
  erc20Decimals: Record<Hex, number>,
  erc20FiatRates: Partial<Record<Hex, number>>,
  chainId: Hex,
): BalanceChange[] {
  return tokenBalanceChanges.map((tokenBc) => {
    const asset: TokenAssetIdentifier = {
      type: convertStandard(tokenBc.standard),
      address: tokenBc.address.toLowerCase() as Hex,
      tokenId: tokenBc.id,
      chainId,
    };

    const decimals =
      asset.type === AssetType.ERC20
        ? erc20Decimals[asset.address] ?? ERC20_DEFAULT_DECIMALS
        : 0;
    const amount = getAssetAmount(tokenBc, decimals);

    const fiatRate = erc20FiatRates[tokenBc.address];
    const fiatAmount = fiatRate
      ? amount.times(fiatRate).toNumber()
      : FIAT_UNAVAILABLE;

    return { asset, amount, fiatAmount };
  });
}

// Compiles a list of balance changes from simulation data
export default function useBalanceChanges({
  chainId,
  simulationData,
}: {
  chainId: Hex;
  simulationData?: SimulationData;
}): { pending: boolean; value: BalanceChange[] } {
  const nativeFiatRate = useSelector((state: RootState) => selectConversionRateByChainId(state, chainId)) as number;
  const fiatCurrency = useSelector(selectCurrentCurrency);

  const { nativeBalanceChange, tokenBalanceChanges = [] } =
    simulationData ?? {};

  const erc20TokenAddresses = tokenBalanceChanges
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((tbc: any) => tbc.standard === SimulationTokenStandard.erc20)
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((tbc: any) => tbc.address);

  const erc20Decimals = useAsyncResultOrThrow(
    () => fetchAllErc20Decimals(erc20TokenAddresses),
    [JSON.stringify(erc20TokenAddresses)],
  );

  const erc20FiatRates = useAsyncResultOrThrow(
    () => fetchTokenFiatRates(fiatCurrency, erc20TokenAddresses, chainId),
    [JSON.stringify(erc20TokenAddresses), chainId, fiatCurrency],
  );

  if (erc20Decimals.pending || erc20FiatRates.pending || !simulationData) {
    return { pending: true, value: [] };
  }

  const nativeChange = getNativeBalanceChange(
    nativeBalanceChange,
    nativeFiatRate,
    chainId,
  );

  const tokenChanges = getTokenBalanceChanges(
    tokenBalanceChanges,
    erc20Decimals.value,
    erc20FiatRates.value,
    chainId,
  );

  const balanceChanges: BalanceChange[] = [
    ...(nativeChange ? [nativeChange] : []),
    ...tokenChanges,
  ];
  return { pending: false, value: balanceChanges };
}
