import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import {
  PACK_PARTNER_PRIVATE_PACK_CODES,
  PACK_PARTNER_RARITIES,
} from '../constants/packPartner';
import type { PpMachine, PpStatus } from '../schemas/packPartner';
import type { PackPartnerPack } from '../types/packPartner';
import { parseUsdcAmount } from './format';

/**
 * Whether a machine can be bought right now.
 *
 * @param machine - Machine from `GET /machines`.
 * @param status - Response of `GET /status`.
 * @returns True when eligible for this app, machines running and this collectibles open.
 */
const isPackOpen = (
  machine: PpMachine,
  status: PpStatus,
  privatePackCodes: readonly string[],
): boolean =>
  (machine.public || privatePackCodes.includes(machine.code)) &&
  status.machineStatus === 'running' &&
  status.gachas.some(
    (collectibles) =>
      collectibles.code === machine.code && collectibles.status === 'open',
  );

/**
 * Maps a machine to the app pack model.
 *
 * @param machine - Machine from `GET /machines`.
 * @returns The pack.
 */
const toPack = (machine: PpMachine): PackPartnerPack => ({
  code: machine.code,
  name: machine.name,
  shortName: machine.shortName,
  category: machine.menuCategory ?? null,
  price: machine.price,
  priceAmount: parseUsdcAmount(machine.price).toString(),
  instantBuybackPercent: machine.instantBuyback,
  odds: {
    common: machine.odds.common,
    uncommon: machine.odds.uncommon,
    rare: machine.odds.rare,
    epic: machine.odds.epic,
  },
  tierRanges: machine.tierRanges,
  ...(machine.ev != null ? { expectedValue: machine.ev } : {}),
  maxValue: Math.max(
    0,
    ...PACK_PARTNER_RARITIES.map((rarity) => machine.tierRanges[rarity].end),
  ),
  menuOrder: machine.menuOrder ?? null,
});

/**
 * Ascending comparison where null sorts last.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns A negative, zero or positive number.
 */
const compareNullable = <Value extends string | number>(
  a: Value | null,
  b: Value | null,
): number => {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  return a < b ? -1 : 1;
};

/**
 * Sort order: category, then menu order, then price.
 *
 * @param a - First pack.
 * @param b - Second pack.
 * @returns A negative, zero or positive number.
 */
const comparePacks = (a: PackPartnerPack, b: PackPartnerPack): number =>
  compareNullable(a.category, b.category) ||
  compareNullable(a.menuOrder, b.menuOrder) ||
  a.price - b.price;

/**
 * Public or explicitly approved private, running and open packs, sorted by category, then menuOrder, then
 * price. `maxValue` is the highest tier range end.
 *
 * @param machines - Machines from `GET /machines` (includes private ones).
 * @param status - Response of `GET /status`.
 * @param privatePackCodes - Explicitly approved private machine codes for this network.
 * @returns The packs to display.
 */
export const toPacks = (
  machines: PpMachine[],
  status: PpStatus,
  privatePackCodes: readonly string[] = PACK_PARTNER_PRIVATE_PACK_CODES[
    PACK_PARTNER_ENVIRONMENT
  ],
): PackPartnerPack[] =>
  machines
    .filter((machine) => isPackOpen(machine, status, privatePackCodes))
    .map(toPack)
    .sort(comparePacks);
