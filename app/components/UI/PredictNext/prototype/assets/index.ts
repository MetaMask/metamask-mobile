import type { ImageSourcePropType } from 'react-native';

/* eslint-disable import-x/no-commonjs, @typescript-eslint/no-require-imports */

/** Official MetaMask fox from the get-started lockup. */
export const MM_FOX = require('./mm-fox.png') as ImageSourcePropType;

/** The wallet's Bitcoin logo, the same mark used for the Bitcoin network. */
export const BITCOIN_LOGO =
  require('../../../../../images/bitcoin-logo.png') as ImageSourcePropType;

/** Brand security illustration for the signed-out marketing banner. */
export const SECURITY_ART = require('./security.png') as ImageSourcePropType;

/** Team helmets and crests, exported from the Kalshi x Predict Figma (feed frame). Keyed by team name. */
export const TEAM_LOGOS: Record<string, ImageSourcePropType> = {
  Bills: require('./nfl-bills.png'),
  Rams: require('./nfl-rams.png'),
  Panthers: require('./nfl-panthers.png'),
  Eagles: require('./nfl-eagles.png'),
  Dolphins: require('./nfl-dolphins.png'),
  Cowboys: require('./nfl-cowboys.png'),
  Brewers: require('./mlb-brewers.png'),
  Dodgers: require('./mlb-dodgers.png'),
  BYU: require('./college-byu.png'),
  'Notre Dame': require('./college-notre-dame.png'),
  Newcastle: require('./epl-newcastle.png'),
  Coventry: require('./epl-coventry.png'),
  Barcelona: require('./ucl-barcelona.png'),
  Galatasaray: require('./ucl-galatasaray.png'),
  /** Kalshi structured-target marks (NBA_PHI / NBA_IND Official Light). */
  '76ers': require('./nba-76ers.png'),
  Pacers: require('./nba-pacers.png'),
};

/** Candidate, artist, and company images from the feed's market cards. Keyed by short name. */
export const PROTO_PHOTOS = {
  trump: require('./person-trump.png') as ImageSourcePropType,
  newsom: require('./person-newsom.png') as ImageSourcePropType,
  harris: require('./person-harris.png') as ImageSourcePropType,
  shapiro: require('./person-shapiro.png') as ImageSourcePropType,
  openai: require('./logo-openai.png') as ImageSourcePropType,
  apple: require('./logo-apple.png') as ImageSourcePropType,
  gta: require('./logo-gta.png') as ImageSourcePropType,
  swift: require('./person-swift.png') as ImageSourcePropType,
  eilish: require('./person-eilish.png') as ImageSourcePropType,
  carpenter: require('./person-carpenter.png') as ImageSourcePropType,
};

/** The wallet's Ethereum logo, square like the Bitcoin mark. */
export const ETH_LOGO =
  require('../../../../../images/eth-logo-new.png') as ImageSourcePropType;
