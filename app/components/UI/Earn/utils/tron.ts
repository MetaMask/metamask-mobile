import { TRON_RESOURCE } from '../../../../core/Multichain/constants';

interface TronResource {
  symbol?: string;
  balance?: string | number;
}

/**
 * Returns the total staked TRX (sTRX) amount derived from TRON resources.
 * Sums both sTRX Energy and sTRX Bandwidth balances.
 */
export const getStakedTrxTotalFromResources = (
  resources?: TronResource[] | null,
): number => {
  if (!Array.isArray(resources)) return 0;

  const parseNum = (v?: string | number) =>
    typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(/,/g, ''));

  const strxEnergy = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_ENERGY,
  );
  const strxBandwidth = resources.find(
    (a) => a.symbol?.toLowerCase() === TRON_RESOURCE.STRX_BANDWIDTH,
  );

  return parseNum(strxEnergy?.balance) + parseNum(strxBandwidth?.balance);
};

// True if the user holds any sTRX according to TRON resources.
export const hasStakedTrxPositions = (
  resources?: TronResource[] | null,
): boolean => getStakedTrxTotalFromResources(resources) > 0;
