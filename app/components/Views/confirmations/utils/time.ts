// @ts-expect-error - humanize-duration is not typed
import humanizeDuration from 'humanize-duration';

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      h: () => 'hr',
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

export const toHumanEstimatedTimeRange = (min: number, max: number) => {
  if (!min || !max) {
    return undefined;
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

// TODO: Add tests
export const toHumanDuration = (seconds: number): string => {
  const milliseconds = seconds * 1000;

  const options = {
    units: ['h', 'm', 's'] as const,
    round: true,
    spacer: ' ',
    largest: 1, // Show only the largest appropriate unit
    maxDecimalPoints: 1,
  };

  return shortEnglishHumanizer(milliseconds, options);
};
