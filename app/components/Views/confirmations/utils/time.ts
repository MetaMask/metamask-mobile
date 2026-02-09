// @ts-expect-error - humanize-duration is not typed
import humanizeDuration from 'humanize-duration';
import { isFastNetwork } from '../components/gas/gas-speed/gas-speed';
import { Hex } from '@metamask/utils';

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      m: () => 'min',
      s: () => 'sec',
    },
  },
});

const withoutUnitHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      m: () => '',
      s: () => '',
    },
  },
});

export const toHumanEstimatedTimeRange = (
  min: number,
  max: number,
  chainId?: string,
) => {
  if (!min || !max) {
    return undefined;
  }

  if (isFastNetwork(chainId as Hex) && min < 1000) {
    return '< 1 sec';
  }

  // Determine if we should show in minutes or seconds
  const minInSeconds = min / 1000;
  const maxInSeconds = max / 1000;
  const useMinutes = maxInSeconds >= 60;

  const options = {
    units: useMinutes ? ['m'] : ['s'],
    round: false,
    spacer: ' ',
    decimal: '.',
    maxDecimalPoints: 1,
  };

  // Handle edge case for values close to a minute
  const adjustedMin =
    useMinutes && minInSeconds >= 59 && minInSeconds < 60 ? 60000 : min;

  return (
    withoutUnitHumanizer(adjustedMin, options) +
    '- ' +
    shortEnglishHumanizer(max, options)
  );
};

export const toHumanSeconds = (milliseconds: number): string => {
  const options = {
    units: ['s'],
    round: false,
    spacer: ' ',
    decimal: '.',
    maxDecimalPoints: 0,
  };

  return shortEnglishHumanizer(milliseconds, options);
};
