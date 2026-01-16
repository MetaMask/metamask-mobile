export enum GameState {
  PreGame = 'PreGame',
  InProgress = 'InProgress',
  Halftime = 'Halftime',
  Final = 'Final',
}

export enum Possession {
  Away = 'away',
  Home = 'home',
  None = 'none',
}

export enum Winner {
  Away = 'away',
  Home = 'home',
  None = 'none',
}

export interface TeamData {
  abbreviation: string;
  color: string;
}

export interface PredictSportScoreboardProps {
  awayTeam: TeamData;
  homeTeam: TeamData;
  awayScore?: number;
  homeScore?: number;
  gameState: GameState;
  eventTitle?: string;
  date?: string;
  time?: string;
  quarter?: string;
  possession?: Possession;
  winner?: Winner;
  testID?: string;
}
