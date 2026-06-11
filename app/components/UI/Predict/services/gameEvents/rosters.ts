/**
 * Static mock rosters used by the simulated play-by-play generator. Keyed by
 * team abbreviation. POC-only — a real play-by-play provider supplies actual
 * player data, making this file obsolete.
 */
const MOCK_NBA_ROSTERS: Record<string, string[]> = {
  SAS: ['V. Wembanyama', 'D. Fox', 'S. Castle', 'D. Vassell', 'J. Sochan'],
  NYK: ['J. Brunson', 'K. Towns', 'M. Bridges', 'OG Anunoby', 'J. Hart'],
  OKC: [
    'S. Gilgeous-Alexander',
    'J. Williams',
    'C. Holmgren',
    'L. Dort',
    'A. Caruso',
  ],
  IND: [
    'T. Haliburton',
    'P. Siakam',
    'B. Mathurin',
    'M. Turner',
    'A. Nembhard',
  ],
  BOS: ['J. Tatum', 'J. Brown', 'D. White', 'K. Porzingis', 'J. Holiday'],
  DEN: ['N. Jokic', 'J. Murray', 'A. Gordon', 'M. Porter Jr.', 'C. Braun'],
  LAL: ['L. James', 'L. Doncic', 'A. Reaves', 'R. Hachimura', 'J. Vanderbilt'],
  GSW: ['S. Curry', 'J. Butler', 'D. Green', 'B. Podziemski', 'M. Moody'],
};

const GENERIC_FALLBACK_PLAYERS = ['#7', '#23', '#11', '#3', '#34'];

/**
 * Returns the mock roster for a team abbreviation, falling back to generic
 * jersey numbers for teams without a hardcoded roster.
 */
export const getRosterForTeam = (abbreviation: string): string[] =>
  MOCK_NBA_ROSTERS[abbreviation.toUpperCase()] ?? GENERIC_FALLBACK_PLAYERS;
