import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import {
  SimulationBalanceChange,
  SimulationData,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';

import { getTokenDetails } from '../../../util/address';
import { useAsyncResultOrThrow } from '../../hooks/useAsyncResult';
import {
  AssetType,
  BalanceChange,
  NATIVE_ASSET_IDENTIFIER,
  TokenAssetIdentifier,
} from './types';

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

// Compiles the balance change for the native asset
function getNativeBalanceChange(
  nativeBalanceChange: SimulationBalanceChange | undefined,
): BalanceChange | undefined {
  if (!nativeBalanceChange) {
    return undefined;
  }
  const asset = NATIVE_ASSET_IDENTIFIER;
  const amount = getAssetAmount(nativeBalanceChange, NATIVE_DECIMALS);
  return { asset, amount };
}

// Compiles the balance changes for token assets
function getTokenBalanceChanges(
  tokenBalanceChanges: SimulationTokenBalanceChange[],
  erc20Decimals: Record<Hex, number>,
): BalanceChange[] {
  return tokenBalanceChanges.map((tokenBc) => {
    const asset: TokenAssetIdentifier = {
      type: convertStandard(tokenBc.standard),
      address: tokenBc.address.toLowerCase() as Hex,
      tokenId: tokenBc.id,
    };

    const decimals =
      asset.type === AssetType.ERC20 ? erc20Decimals[asset.address] : 0;
    const amount = getAssetAmount(tokenBc, decimals);

    return { asset, amount };
  });
}

// Compiles a list of balance changes from simulation data
export default function useBalanceChanges(
  simulationData: SimulationData | undefined,
): { pending: boolean; value: BalanceChange[] } {
  const { nativeBalanceChange, tokenBalanceChanges = [] } =
    simulationData ?? {};

  const erc20TokenAddresses = tokenBalanceChanges
    .filter((tbc) => tbc.standard === SimulationTokenStandard.erc20)
    .map((tbc) => tbc.address);

  const erc20Decimals = useAsyncResultOrThrow(
    () => fetchAllErc20Decimals(erc20TokenAddresses),
    [JSON.stringify(erc20TokenAddresses)],
  );

  if (erc20Decimals.pending || !simulationData) {
    return { pending: true, value: [] };
  }

  const nativeChange = getNativeBalanceChange(nativeBalanceChange);
  const tokenChanges = getTokenBalanceChanges(
    tokenBalanceChanges,
    erc20Decimals.value,
  );

  const balanceChanges: BalanceChange[] = [
    ...(nativeChange ? [nativeChange] : []),
    ...tokenChanges,
  ];
  return { pending: false, value: balanceChanges };
}
