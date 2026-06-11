const SPORT_MARKET_TYPE_PREFIXES = ['soccer_', 'basketball_', 'tennis_'];

const LABEL_OVERRIDES: Record<string, string> = {
  first_half: '1st Half',
  second_half: '2nd Half',
  first_set: '1st Set',
  goals_plus_assists: 'Goals + Assists',
  shots_on_target: 'Shots on Target',
  goalkeeper_saves: 'Goalkeeper Saves',
};

export const isMissingI18nLabel = (value: string, key: string): boolean =>
  value === key || value.startsWith('[missing');

const toTitleCase = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const toReadableMarketLabel = (value: string): string => {
  const lower = value.toLowerCase();
  const withoutPlayerPrefix = lower.replace(/^[a-z0-9]+_player_/, '');
  const matchingSportPrefix = SPORT_MARKET_TYPE_PREFIXES.find((prefix) =>
    withoutPlayerPrefix.startsWith(prefix),
  );
  const withoutSportPrefix = matchingSportPrefix
    ? withoutPlayerPrefix.slice(matchingSportPrefix.length)
    : withoutPlayerPrefix;

  return LABEL_OVERRIDES[withoutSportPrefix] ?? toTitleCase(withoutSportPrefix);
};
