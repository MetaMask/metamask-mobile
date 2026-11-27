import type { EpicHuntMachine, RankedEpicHuntPack } from '../types/packs';

const maxEpicOddsPacks = 10;
const floatTolerance = 1e-9;

export const getAveragePullsPerEpic = (epicOdds: number) =>
  Math.ceil(1 / epicOdds - floatTolerance);

export const getPullsOverAverage = (pack: RankedEpicHuntPack) =>
  pack.pullsSinceEpic - pack.averagePulls;

export function rankEpicOddsPacks(machines: EpicHuntMachine[]) {
  const ranked: RankedEpicHuntPack[] = machines.flatMap((machine) => {
    const { epicOdds, priceUsd } = machine;

    if (
      !machine.isMachineOpen ||
      !machine.isApproved ||
      priceUsd === undefined ||
      epicOdds === undefined ||
      !(epicOdds > 0 && epicOdds <= 1) ||
      !(machine.pullsSinceEpic >= 0)
    ) {
      return [];
    }

    const averagePulls = getAveragePullsPerEpic(epicOdds);

    return [
      {
        ...machine,
        priceUsd,
        epicOdds,
        averagePulls,
        ratio: machine.pullsSinceEpic / averagePulls,
      },
    ];
  });

  return ranked
    .sort((a, b) => b.ratio - a.ratio || a.priceUsd - b.priceUsd)
    .slice(0, maxEpicOddsPacks);
}
