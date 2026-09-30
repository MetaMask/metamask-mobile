import { COLLECTOR_CRYPT_RARITIES } from '../constants';
import type { CcMachine, CcStatus } from '../schemas';
import type { CollectorCryptPack } from '../types';

/**
 * Whether a machine can be bought right now.
 *
 * @param machine - Machine from `GET /machines`.
 * @param status - Response of `GET /status`.
 * @returns True when public, machines running and this gacha open.
 */
const isPackOpen = (machine: CcMachine, status: CcStatus): boolean =>
  machine.public &&
  status.machineStatus === 'running' &&
  status.gachas.some(
    (gacha) => gacha.code === machine.code && gacha.status === 'open',
  );

/**
 * Maps a machine to the app pack model.
 *
 * @param machine - Machine from `GET /machines`.
 * @returns The pack.
 */
const toPack = (machine: CcMachine): CollectorCryptPack => ({
  code: machine.code,
  name: machine.name,
  shortName: machine.shortName,
  category: machine.menuCategory ?? null,
  price: machine.price,
  instantBuybackPercent: machine.instantBuyback,
  odds: {
    common: machine.odds.common,
    uncommon: machine.odds.uncommon,
    rare: machine.odds.rare,
    epic: machine.odds.epic,
  },
  maxValue: Math.max(
    0,
    ...COLLECTOR_CRYPT_RARITIES.map((rarity) => machine.tierRanges[rarity].end),
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
const comparePacks = (a: CollectorCryptPack, b: CollectorCryptPack): number =>
  compareNullable(a.category, b.category) ||
  compareNullable(a.menuOrder, b.menuOrder) ||
  a.price - b.price;

/**
 * Public, running and open packs, sorted by category, then menuOrder, then
 * price. `maxValue` is the highest tier range end.
 *
 * @param machines - Machines from `GET /machines` (includes private ones).
 * @param status - Response of `GET /status`.
 * @returns The packs to display.
 */
export const toPacks = (
  machines: CcMachine[],
  status: CcStatus,
): CollectorCryptPack[] =>
  machines
    .filter((machine) => isPackOpen(machine, status))
    .map(toPack)
    .sort(comparePacks);
