import type { EpicOddsMachine, RankedEpicOddsPack } from '../types/packs';

const maxEpicOddsPacks = 10;
const floatTolerance = 1e-9;

export const getAveragePullsPerEpic = (epicOdds: number) =>
  Math.ceil(1 / epicOdds - floatTolerance);

export const getEpicGaugeValue = (pack: RankedEpicOddsPack) =>
  pack.pullsSinceEpic - pack.averagePulls;

export function rankEpicOddsPacks(machines: EpicOddsMachine[]) {
  const ranked: RankedEpicOddsPack[] = machines.flatMap((machine) => {
    const { epicOdds, priceUsd } = machine;

    if (
      !machine.isMachineOpen ||
      !machine.isApproved ||
      priceUsd === undefined ||
      !epicOdds ||
      epicOdds <= 0
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
