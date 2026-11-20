import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';
import type {
  VaultCompositionComponent,
  VaultCompositionProtocol,
} from '../types/moneyVaultComposition';

const VERSION_PATTERN = /^v\d+$/i;
const DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const MAX_ALLOCATION_FRACTION = new BigNumber(1);

const formatProtocolName = (protocol: string): string =>
  protocol
    .split('_')
    .map((part) =>
      VERSION_PATTERN.test(part)
        ? part.toLowerCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`,
    )
    .join(' ');

/**
 * Returns the primary asset symbol for a vault component.
 *
 * @param component - Vault composition component from the API.
 * @returns The first asset symbol.
 */
export const getVaultCompositionPrimaryAssetSymbol = (
  component: VaultCompositionComponent,
): string => {
  const assetSymbol = component.assets[0]?.asset_symbol;
  if (!assetSymbol) {
    throw new Error(
      'Cannot format vault composition component without an asset symbol',
    );
  }

  return assetSymbol;
};

/**
 * Formats a vault component protocol for display.
 *
 * @param protocol - Vault component protocol.
 * @returns A localized or human-readable protocol name.
 */
export const formatVaultCompositionProtocolName = (
  protocol: VaultCompositionComponent['protocol'],
): string =>
  protocol === 'liquidity_buffer'
    ? strings('money.earnings.cash_reserve')
    : formatProtocolName(protocol);

/**
 * Formats a vault component protocol and first asset for display.
 *
 * @param component - Vault composition component from the API.
 * @returns A protocol-and-asset label separated by a middle dot.
 */
export const formatVaultCompositionLabel = (
  component: VaultCompositionComponent,
): string =>
  `${formatVaultCompositionProtocolName(component.protocol)} · ${getVaultCompositionPrimaryAssetSymbol(component)}`;

/**
 * Returns protocols sorted by descending allocation.
 *
 * The input array is copied before sorting. Protocol keys provide a stable
 * order when allocations are equal.
 *
 * @param protocols - Protocol allocations returned by the API.
 * @returns A validated, allocation-descending protocol array.
 */
export const getVaultCompositionProtocolsInAllocationOrder = (
  protocols: VaultCompositionProtocol[],
): VaultCompositionProtocol[] =>
  protocols
    .map((protocol) => ({
      protocol,
      allocation: parseProtocolAllocation(
        protocol.allocation_fraction,
        'order',
      ),
    }))
    .sort((first, second) => {
      if (first.allocation.gt(second.allocation)) {
        return -1;
      }

      if (first.allocation.lt(second.allocation)) {
        return 1;
      }

      if (first.protocol.protocol_key === second.protocol.protocol_key) {
        return 0;
      }

      return first.protocol.protocol_key < second.protocol.protocol_key
        ? -1
        : 1;
    })
    .map(({ protocol }) => protocol);

/**
 * Converts a protocol allocation fraction into a percentage bar width.
 *
 * @param allocationFraction - Decimal fraction between `0` and `1`.
 * @returns Bar width as a percentage number between `0` and `100`.
 */
export const getVaultCompositionBarWidth = (
  allocationFraction: string,
): number =>
  parseProtocolAllocation(allocationFraction, 'bar width')
    .times(100)
    .toNumber();

function parseProtocolAllocation(
  allocationFraction: string,
  context: 'order' | 'bar width',
): BigNumber {
  const parsedAllocation = DECIMAL_PATTERN.test(allocationFraction)
    ? new BigNumber(allocationFraction)
    : null;

  if (
    parsedAllocation === null ||
    !parsedAllocation.isFinite() ||
    parsedAllocation.isNegative() ||
    parsedAllocation.gt(MAX_ALLOCATION_FRACTION)
  ) {
    throw new Error(
      context === 'order'
        ? `Cannot order vault composition protocols with invalid allocation fraction '${allocationFraction}'`
        : `Cannot calculate vault composition bar width from invalid allocation fraction '${allocationFraction}'`,
    );
  }

  return parsedAllocation;
}
