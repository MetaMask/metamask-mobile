import type { ImageSourcePropType } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import { PALETTE } from './palette';
import { PROTO_PHOTOS, TEAM_LOGOS } from './assets';

export interface ProtoAvatar {
  text: string;
  color: string;
  textColor?: string;
  /** Figma photo or logo; falls back to the letter when absent. */
  image?: ImageSourcePropType;
  /** `contain` for helmets and crests, `cover` (circle) for photos. */
  imageFit?: 'cover' | 'contain';
  /** Mirror the image so a football helmet faces its opponent. */
  flip?: boolean;
}

export interface ProtoOutcome {
  id: string;
  label: string;
  /** Ask price in cents, 1–99. */
  price: number;
  color: string;
  avatar?: ProtoAvatar;
  /** Shown to the right of the label, e.g. a spread line. */
  detail?: string;
}

export interface ProtoMarket {
  id: string;
  title: string;
  outcomes: ProtoOutcome[];
  rules: string;
}

export type ProtoSectionKind = 'outcomes' | 'line' | 'grouped';

export interface ProtoSection {
  id: string;
  title: string;
  volume: string;
  tab: 'lines' | 'props';
  kind: ProtoSectionKind;
  initiallyCollapsed?: boolean;
  markets: ProtoMarket[];
  /** Selectable lines for spread/total sections. */
  lines?: number[];
  moreCount?: number;
}

export interface ProtoTeam {
  name: string;
  abbr: string;
  color: string;
  textColor: string;
  record: string;
  logo?: ImageSourcePropType;
}

export interface ProtoGameEvent {
  kind: 'game';
  id: string;
  title: string;
  league: string;
  startTime: string;
  away: ProtoTeam;
  home: ProtoTeam;
  awayScore: number;
  homeScore: number;
  period: string;
  clockSeconds: number;
  isLive: boolean;
  awayProbability: number;
  sections: ProtoSection[];
}

export interface ProtoStandardEvent {
  kind: 'standard';
  id: string;
  title: string;
  category: string;
  meta: string;
  volume: string;
  outcomes: ProtoOutcome[];
  rules: string;
  /** Events with a start time count down to it, e.g. an awards show. */
  startsInMinutes?: number;
}

export interface ProtoCryptoEvent {
  kind: 'crypto';
  id: string;
  title: string;
  asset: string;
  ticker: string;
  color: string;
  priceToBeat: number;
  startPrice: number;
  volatility: number;
  roundSeconds: number;
  window: string;
  /** Feed-card title; the detail screen keeps `title`. */
  feedTitle?: string;
  /** Seconds left in the first round, so the feed opens mid-round. */
  startSeconds?: number;
}

export type ProtoEvent = ProtoGameEvent | ProtoStandardEvent | ProtoCryptoEvent;

const BLUE = PALETTE.blue;
const YELLOW = PALETTE.yellow;
const GREEN = PALETTE.green;
const RED = PALETTE.red;
const PURPLE = PALETTE.purple;
const ORANGE = PALETTE.orange;
const TEAL = PALETTE.teal;

const team = (
  name: string,
  abbr: string,
  color: string,
  record: string,
  textColor: string = PALETTE.white,
): ProtoTeam => ({
  name,
  abbr,
  color,
  textColor,
  record,
  logo: TEAM_LOGOS[name],
});

/** Football helmets. Crests and wordmarks are not mirrored. */
const HELMET_TEAMS = new Set([
  'Bills',
  'Rams',
  'Panthers',
  'Eagles',
  'Dolphins',
  'Cowboys',
  'Notre Dame',
  'BYU',
]);

/** The Eagles export faces left. The other helmets already face right. */
const HELMETS_FACING_LEFT = new Set(['Eagles']);

/**
 * Avatar for a team. On a versus lockup, pass `side` so the two football
 * helmets face each other. Lists leave `side` unset and keep the natural facing.
 */
export const teamAvatar = (
  entry: ProtoTeam,
  side?: 'away' | 'home',
): ProtoAvatar => {
  const faceLeft = side === 'home';
  return {
    text: entry.abbr[0],
    color: entry.color,
    image: entry.logo,
    imageFit: 'contain',
    flip:
      HELMET_TEAMS.has(entry.name) &&
      HELMETS_FACING_LEFT.has(entry.name) !== faceLeft,
  };
};

const outcome = (
  id: string,
  label: string,
  price: number,
  color: string,
  extra: Partial<ProtoOutcome> = {},
): ProtoOutcome => ({ id, label, price, color, ...extra });

const moneylineRules = (teamName: string, otherName: string) =>
  `Resolves to Yes if ${teamName} wins the game, including any overtime periods. Resolves to No if ${otherName} wins.`;

const buildGameSections = (
  away: ProtoTeam,
  home: ProtoTeam,
  awayPrice: number,
): ProtoSection[] => {
  const homePrice = 100 - awayPrice;
  const awayAvatar = teamAvatar(away);
  const homeAvatar = teamAvatar(home);
  return [
    {
      id: 'moneyline',
      title: 'Moneyline',
      volume: '$1.2M',
      tab: 'lines',
      kind: 'outcomes',
      markets: [
        {
          id: 'moneyline',
          title: `${away.name} to win`,
          rules: moneylineRules(away.name, home.name),
          outcomes: [
            outcome('ml-away', away.name, awayPrice, away.color, {
              avatar: awayAvatar,
            }),
            outcome('ml-home', home.name, homePrice, home.color, {
              avatar: homeAvatar,
            }),
          ],
        },
      ],
    },
    {
      id: 'spread',
      title: 'Spread',
      volume: '$180K',
      tab: 'lines',
      kind: 'line',
      lines: [11.5, 9.5, 8.5, 7.5, 6.5, 5.5],
      moreCount: 8,
      markets: [
        {
          id: 'spread',
          title: `${away.name} spread`,
          rules: `Resolves to Yes if ${away.name} wins by more than the selected line. Pushes are not possible on half-point lines.`,
          outcomes: [
            outcome('sp-away', away.name, 46, away.color, { detail: '-7.5' }),
            outcome('sp-home', home.name, 54, home.color, { detail: '+7.5' }),
          ],
        },
      ],
    },
    {
      id: 'total',
      title: 'Total points',
      volume: '$104K',
      tab: 'lines',
      kind: 'line',
      lines: [226.5, 227.5, 228.5, 229.5, 230.5],
      moreCount: 6,
      markets: [
        {
          id: 'total',
          title: 'Total points',
          rules:
            'Resolves to Over if the combined final score is above the selected line, including overtime.',
          outcomes: [
            outcome('tot-over', 'Over', 48, GREEN, { detail: 'O 228.5' }),
            outcome('tot-under', 'Under', 52, RED, { detail: 'U 228.5' }),
          ],
        },
      ],
    },
    {
      id: 'team-total',
      title: 'Team total',
      volume: '$12.3K',
      tab: 'lines',
      kind: 'outcomes',
      initiallyCollapsed: true,
      markets: [
        {
          id: 'team-total',
          title: `${away.name} 115+ points`,
          rules: `Resolves to Yes if ${away.name} scores 115 or more points, including overtime.`,
          outcomes: [
            outcome('tt-away', `${away.name} 115+`, 58, away.color),
            outcome('tt-home', `${home.name} 110+`, 61, home.color),
          ],
        },
      ],
    },
    {
      id: 'player-points',
      title: 'Player points',
      volume: '$32.2K',
      tab: 'props',
      kind: 'grouped',
      moreCount: 12,
      markets: [
        {
          id: 'pp-a',
          title: 'Player A',
          rules: 'Resolves to Yes if Player A reaches the listed points.',
          outcomes: [
            outcome('ppa-25', '25+ points', 48, BLUE),
            outcome('ppa-30', '30+ points', 27, BLUE),
          ],
        },
        {
          id: 'pp-b',
          title: 'Player B',
          rules: 'Resolves to Yes if Player B reaches the listed points.',
          outcomes: [
            outcome('ppb-20', '20+ points', 71, GREEN),
            outcome('ppb-25', '25+ points', 50, GREEN),
          ],
        },
        {
          id: 'pp-c',
          title: 'Player C',
          rules: 'Resolves to Yes if Player C reaches the listed points.',
          outcomes: [
            outcome('ppc-15', '15+ points', 66, YELLOW),
            outcome('ppc-20', '20+ points', 39, YELLOW),
          ],
        },
      ],
    },
    {
      id: 'player-assists',
      title: 'Player assists',
      volume: '$26.6K',
      tab: 'props',
      kind: 'grouped',
      initiallyCollapsed: true,
      markets: [
        {
          id: 'pa-a',
          title: 'Player A',
          rules: 'Resolves to Yes if Player A reaches the listed assists.',
          outcomes: [
            outcome('paa-6', '6+ assists', 55, BLUE),
            outcome('paa-8', '8+ assists', 31, BLUE),
          ],
        },
      ],
    },
    {
      id: 'player-rebounds',
      title: 'Player rebounds',
      volume: '$14.4K',
      tab: 'props',
      kind: 'grouped',
      initiallyCollapsed: true,
      markets: [
        {
          id: 'pr-b',
          title: 'Player B',
          rules: 'Resolves to Yes if Player B reaches the listed rebounds.',
          outcomes: [
            outcome('prb-8', '8+ rebounds', 62, GREEN),
            outcome('prb-10', '10+ rebounds', 40, GREEN),
          ],
        },
      ],
    },
    {
      id: 'winning-margin',
      title: 'Winning margin',
      volume: '$6.7K',
      tab: 'lines',
      kind: 'outcomes',
      moreCount: 8,
      markets: [
        {
          id: 'margin',
          title: 'Winning margin',
          rules: 'Resolves to the outcome matching the final margin.',
          outcomes: [
            outcome('wm-1', `${away.name} by 1–5`, 14, away.color),
            outcome('wm-2', `${away.name} by 6–10`, 17, away.color),
            outcome('wm-3', `${home.name} by 1–5`, 9, home.color),
          ],
        },
      ],
    },
    {
      id: 'overtime',
      title: 'Goes to overtime',
      volume: '$2.1K',
      tab: 'lines',
      kind: 'outcomes',
      markets: [
        {
          id: 'ot',
          title: 'Goes to overtime',
          rules: 'Resolves to Yes if regulation ends tied.',
          outcomes: [
            outcome('ot-yes', 'Yes', 8, GREEN),
            outcome('ot-no', 'No', 93, RED),
          ],
        },
      ],
    },
    {
      id: 'first-20',
      title: 'First team to 20 points',
      volume: '$1.4K',
      tab: 'lines',
      kind: 'outcomes',
      markets: [
        {
          id: 'first20',
          title: 'First team to 20 points',
          rules: 'Resolves to the first team to reach 20 points.',
          outcomes: [
            outcome('f20-away', away.name, 49, away.color),
            outcome('f20-home', home.name, 52, home.color),
          ],
        },
      ],
    },
  ];
};

const sixers = team('76ers', 'PHI', PALETTE.sixers, '22-14');
const pacers = team('Pacers', 'IND', PALETTE.pacers, '19-17', PALETTE.navy);
const panthers = team('Panthers', 'CAR', PALETTE.panthers, '2-2');
const eagles = team('Eagles', 'PHI', TEAL, '3-3');
const bills = team('Bills', 'BUF', PALETTE.bills, '4-1');
const rams = team('Rams', 'LAR', PALETTE.rams, '3-2');

export const GAME_EVENTS: ProtoGameEvent[] = [
  {
    kind: 'game',
    id: 'phi-ind',
    title: '76ers vs. Pacers',
    league: 'NBA',
    startTime: 'Live',
    away: sixers,
    home: pacers,
    awayScore: 78,
    homeScore: 71,
    period: 'Q3',
    clockSeconds: 252,
    isLive: true,
    awayProbability: 71,
    sections: buildGameSections(sixers, pacers, 71),
  },
  {
    kind: 'game',
    id: 'car-phi',
    title: 'Panthers vs. Eagles',
    league: 'NFL',
    startTime: 'Live',
    away: panthers,
    home: eagles,
    // Figma feed frame: Panthers 20, Eagles 13, Q4 02:19, 85% / 15%.
    awayScore: 20,
    homeScore: 13,
    period: 'Q4',
    clockSeconds: 2 * 60 + 19,
    isLive: true,
    awayProbability: 85,
    sections: buildGameSections(panthers, eagles, 85),
  },
  {
    kind: 'game',
    id: 'buf-lar',
    title: 'Bills vs. Rams',
    league: 'NFL',
    startTime: 'Live',
    away: bills,
    home: rams,
    awayScore: 17,
    homeScore: 14,
    period: 'Q4',
    clockSeconds: 2 * 60 + 19,
    isLive: true,
    awayProbability: 50,
    sections: buildGameSections(bills, rams, 50),
  },
];

const compactGame = (
  id: string,
  league: string,
  startTime: string,
  away: ProtoTeam,
  home: ProtoTeam,
  awayPrice: number,
): ProtoGameEvent => ({
  kind: 'game',
  id,
  title: `${away.name} vs. ${home.name}`,
  league,
  startTime,
  away,
  home,
  awayScore: 0,
  homeScore: 0,
  period: '',
  clockSeconds: 0,
  isLive: false,
  awayProbability: awayPrice,
  sections: buildGameSections(away, home, awayPrice),
});

export const UPCOMING_GAMES: ProtoGameEvent[] = [
  compactGame(
    'mia-dal',
    'NFL',
    'Mon · 8:15 pm',
    team('Dolphins', 'MIA', PALETTE.dolphins, '2-3'),
    team('Cowboys', 'DAL', PALETTE.cowboys, '3-2'),
    39,
  ),
  compactGame(
    'gal-bar',
    'UCL',
    'Tue · 3:00 pm',
    team('Galatasaray', 'GAL', PALETTE.galatasaray, '1-0'),
    team('Barcelona', 'BAR', PALETTE.barcelona, '2-0'),
    11,
  ),
  compactGame(
    'cov-new',
    'EFL',
    'Mon · 3:00 pm',
    team('Coventry', 'COV', PALETTE.coventry, '5-2'),
    team('Newcastle', 'NEW', PALETTE.newcastle, '4-3'),
    30,
  ),
  compactGame(
    'nd-byu',
    'NCAAF',
    'Sat · 7:30 pm',
    team('Notre Dame', 'ND', PALETTE.notreDame, '5-1'),
    team('BYU', 'BYU', PALETTE.byu, '6-0'),
    77,
  ),
  compactGame(
    'lad-mil',
    'MLB',
    'Sat · 8:00 pm',
    team('Dodgers', 'LAD', PALETTE.dodgers, '93-69'),
    team('Brewers', 'MIL', PALETTE.brewers, '97-65'),
    55,
  ),
];

const person = (
  text: string,
  color: string,
  photo?: ImageSourcePropType,
): ProtoAvatar => ({ text, color, image: photo, imageFit: 'cover' });

export const STANDARD_EVENTS: ProtoStandardEvent[] = [
  {
    kind: 'standard',
    id: 'aoty',
    title: 'Who wins Album of the Year?',
    category: 'Culture',
    meta: 'Grammys · Tonight',
    volume: '$2.1M',
    startsInMinutes: 192,
    rules:
      'Resolves to the artist announced as the Album of the Year winner at the ceremony.',
    outcomes: [
      outcome('ts', 'Taylor Swift', 34, PURPLE, {
        avatar: person('T', PALETTE.swift, PROTO_PHOTOS.swift),
      }),
      outcome('be', 'Billie Eilish', 22, GREEN, {
        avatar: person('B', PALETTE.eilish, PROTO_PHOTOS.eilish),
      }),
      outcome('sc', 'Sabrina Carpenter', 18, YELLOW, {
        avatar: person('S', PALETTE.carpenter, PROTO_PHOTOS.carpenter),
      }),
    ],
  },
  {
    kind: 'standard',
    id: 'trump-2028',
    title: 'Will Trump win the 2028 nomination?',
    category: 'Politics',
    meta: 'Closes Jul 2028',
    volume: '$4.2M',
    rules:
      'Resolves to Yes if Donald Trump is the Republican nominee for the 2028 presidential election.',
    outcomes: [
      outcome('yes', 'Yes', 62, GREEN, {
        avatar: person('T', PALETTE.trump, PROTO_PHOTOS.trump),
      }),
      outcome('no', 'No', 41, RED, {
        avatar: person('T', PALETTE.trump, PROTO_PHOTOS.trump),
      }),
    ],
  },
  {
    kind: 'standard',
    id: 'dem-2028',
    title: 'Who is the 2028 Democratic nominee?',
    category: 'Politics',
    meta: 'Closes Aug 2028',
    volume: '$6.4M',
    rules:
      'Resolves to the person nominated by the Democratic Party for the 2028 presidential election.',
    outcomes: [
      outcome('newsom', 'Newsom', 31, BLUE, {
        avatar: person('N', PALETTE.newsom, PROTO_PHOTOS.newsom),
      }),
      outcome('harris', 'Harris', 24, PURPLE, {
        avatar: person('H', PALETTE.harris, PROTO_PHOTOS.harris),
      }),
      outcome('shapiro', 'Shapiro', 18, GREEN, {
        avatar: person('S', PALETTE.shapiro, PROTO_PHOTOS.shapiro),
      }),
    ],
  },
  {
    kind: 'standard',
    id: 'openai-ipo',
    title: 'Will OpenAI IPO before 2027?',
    category: 'Tech',
    meta: 'Closes Dec 31',
    volume: '$850K',
    rules: 'Resolves to Yes if OpenAI lists shares on a public exchange.',
    outcomes: [
      outcome('yes', 'Yes', 28, GREEN, {
        avatar: person('O', PALETTE.openai, PROTO_PHOTOS.openai),
      }),
      outcome('no', 'No', 74, RED, {
        avatar: person('O', PALETTE.openai, PROTO_PHOTOS.openai),
      }),
    ],
  },
  {
    kind: 'standard',
    id: 'apple-earnings',
    title: 'Will Apple beat earnings this quarter?',
    category: 'Tech',
    meta: 'Today after close',
    volume: '$1.1M',
    rules:
      'Resolves to Yes if reported EPS beats the consensus estimate at the time of the report.',
    outcomes: [
      outcome('yes', 'Yes', 55, GREEN, {
        avatar: person('A', PALETTE.apple, PROTO_PHOTOS.apple),
      }),
      outcome('no', 'No', 48, RED, {
        avatar: person('A', PALETTE.apple, PROTO_PHOTOS.apple),
      }),
    ],
  },
  {
    kind: 'standard',
    id: 'gta6',
    title: 'Will GTA 6 release in 2026?',
    category: 'Culture',
    meta: 'Closes Dec 31',
    volume: '$3.3M',
    rules: 'Resolves to Yes if GTA 6 is commercially released in 2026.',
    outcomes: [
      outcome('yes', 'Yes', 41, GREEN, {
        avatar: person('6', PALETTE.gta, PROTO_PHOTOS.gta),
      }),
      outcome('no', 'No', 61, RED, {
        avatar: person('6', PALETTE.gta, PROTO_PHOTOS.gta),
      }),
    ],
  },
];

export const CRYPTO_EVENTS: ProtoCryptoEvent[] = [
  {
    kind: 'crypto',
    id: 'btc-15m',
    title: 'Bitcoin up or down',
    asset: 'Bitcoin',
    ticker: 'BTC',
    color: ORANGE,
    // Target sits just above the open price, so the feed opens on Up 33%.
    priceToBeat: 76338.41,
    startPrice: 76328.41,
    volatility: 9,
    roundSeconds: 300,
    startSeconds: 19,
    feedTitle: 'BTC Up/Down - 5 Min',
    window: '3:00–3:05 PM',
  },
  {
    kind: 'crypto',
    id: 'eth-15m',
    title: 'Ethereum up or down',
    asset: 'Ethereum',
    ticker: 'ETH',
    color: PALETTE.ethereum,
    priceToBeat: 3414.28,
    startPrice: 3412.08,
    volatility: 0.9,
    roundSeconds: 300,
    startSeconds: 199,
    feedTitle: 'ETH Up/Down - 5 Min',
    window: '3:00–3:05 PM',
  },
];

/**
 * Volume and comment seeds for the feed cards, from the Figma frame. They are
 * the starting point for the live engagement ticker, not real data.
 */
export const FEED_STATS = {
  trendingGame: { volume: '$1.0M', comments: 393 },
  trendingBtc: { volume: '$1.0M', comments: 393 },
  trendingEth: { volume: '$1.0M', comments: 393 },
  liveGame: { volume: '$1.0M', comments: 393 },
  upcomingGame: { volume: '$1.0M', comments: 393 },
  cryptoBtc: { volume: '$5.2M', comments: 393 },
  cryptoEth: { volume: '$5.2M', comments: 393 },
} as const;

export const FEED_SECTIONS: { title: string; eventIds: string[] }[] = [
  { title: 'Politics', eventIds: ['trump-2028', 'dem-2028'] },
  { title: 'Tech', eventIds: ['openai-ipo', 'apple-earnings'] },
  { title: 'Culture', eventIds: ['gta6', 'aoty'] },
];

export const CATEGORIES = [
  'Politics',
  'Sports',
  'Crypto',
  'E-sports',
  'Weather',
  'Finance',
  'Tech',
  'Culture',
];

/** Design-system marks for categories, used on chips and as card tiles. */
export const CATEGORY_ICONS: Record<string, IconName> = {
  Politics: IconName.Bank,
  Sports: IconName.Trophy,
  Crypto: IconName.Coin,
  'E-sports': IconName.GameController,
  Weather: IconName.Global,
  Finance: IconName.Chart,
  Tech: IconName.Monitor,
  Culture: IconName.Sparkle,
};

/** League marks, also the fallback until league logo rights are confirmed. */
export const leagueIcon = (league: string): IconName => {
  switch (league) {
    case 'NBA':
      return IconName.Basketball;
    case 'MLB':
      return IconName.Baseball;
    case 'UCL':
    case 'EFL':
      return IconName.SoccerBall;
    default:
      return IconName.Football;
  }
};

const ALL_EVENTS: ProtoEvent[] = [
  ...GAME_EVENTS,
  ...UPCOMING_GAMES,
  ...STANDARD_EVENTS,
  ...CRYPTO_EVENTS,
];

export const getProtoEvent = (id: string): ProtoEvent | undefined =>
  ALL_EVENTS.find((event) => event.id === id);

export interface ProtoEventGroup {
  title: string;
  events: ProtoEvent[];
}

/**
 * Events for a category page. Sports splits by league, in the order the
 * leagues first appear so live games lead; other categories are one group.
 */
export const categoryGroups = (category: string): ProtoEventGroup[] => {
  if (category === 'Sports') {
    const byLeague = new Map<string, ProtoEvent[]>();
    [...GAME_EVENTS, ...UPCOMING_GAMES].forEach((game) => {
      byLeague.set(game.league, [...(byLeague.get(game.league) ?? []), game]);
    });
    return [...byLeague].map(([title, events]) => ({ title, events }));
  }
  const events =
    category === 'Crypto'
      ? CRYPTO_EVENTS
      : STANDARD_EVENTS.filter((event) => event.category === category);
  return events.length ? [{ title: category, events }] : [];
};

/** Deterministic pseudo-random sequence so charts are stable per seed. */
export const seededRandom = (seed: number) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

/** Stable starting comment count for a market with no count of its own. */
export const commentSeed = (id: string) =>
  80 +
  (Math.abs(
    id.split('').reduce((acc, char) => acc * 31 + char.charCodeAt(0), 7),
  ) %
    640);

export const KALSHI_FEE_RATE = 0.07;

/** Kalshi-style fee: rate × contracts × p × (1 − p), rounded up to the cent. */
export const quoteOrder = (amountUsd: number, priceCents: number) => {
  const price = priceCents / 100;
  if (amountUsd <= 0 || price <= 0) {
    return { contracts: 0, fee: 0, cost: 0, payout: 0 };
  }
  const contracts = Math.floor(amountUsd / price);
  const fee =
    Math.ceil(KALSHI_FEE_RATE * contracts * price * (1 - price) * 100) / 100;
  const cost = Math.max(0, amountUsd - fee);
  return { contracts, fee, cost, payout: contracts };
};

/**
 * Cents, with thousands separators. Hermes ignores `toLocaleString` fraction
 * options, which is how position P&L was printing a raw float.
 */
export const formatUsd = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  const negative = safe < 0;
  const [whole, fraction] = Math.abs(safe).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${fraction}`;
};
