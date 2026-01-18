import React from 'react';
import { render } from '@testing-library/react-native';
import PredictSportScoreboard from './PredictSportScoreboard';
import { PredictMarketGame, PredictGameStatus } from '../../types';
import { useLiveGameUpdates } from '../../hooks/useLiveGameUpdates';

jest.mock('../../hooks/useLiveGameUpdates');
const mockUseLiveGameUpdates = useLiveGameUpdates as jest.MockedFunction<
  typeof useLiveGameUpdates
>;

jest.mock('../PredictSportTeamHelmet/PredictSportTeamHelmet', () => {
  const MockHelmet = ({ testID }: { testID?: string }) => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={testID} />;
  };
  return MockHelmet;
});

jest.mock('../PredictSportFootballIcon/PredictSportFootballIcon', () => {
  const MockFootball = ({ testID }: { testID?: string }) => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={testID} />;
  };
  return MockFootball;
});

jest.mock('../PredictSportWinner/PredictSportWinner', () => {
  const MockWinner = ({ testID }: { testID?: string }) => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={testID} />;
  };
  return MockWinner;
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.sports.halftime': 'Halftime',
      'predict.sports.final': 'Final',
    };
    return translations[key] || key;
  },
}));

const createGame = (
  overrides: Partial<PredictMarketGame> = {},
): PredictMarketGame => ({
  id: 'game-123',
  startTime: '2026-02-08T20:30:00Z',
  status: 'scheduled',
  league: 'nfl',
  elapsed: null,
  period: null,
  score: null,
  homeTeam: {
    id: 'team-den',
    name: 'Denver Broncos',
    logo: 'https://example.com/den.png',
    abbreviation: 'DEN',
    color: '#FB4F14',
    alias: 'Broncos',
  },
  awayTeam: {
    id: 'team-sea',
    name: 'Seattle Seahawks',
    logo: 'https://example.com/sea.png',
    abbreviation: 'SEA',
    color: '#002244',
    alias: 'Seahawks',
  },
  ...overrides,
});

const createLiveUpdate = (overrides = {}) => ({
  gameUpdate: null,
  isConnected: false,
  lastUpdateTime: null,
  ...overrides,
});

describe('PredictSportScoreboard', () => {
  beforeEach(() => {
    mockUseLiveGameUpdates.mockReturnValue(createLiveUpdate());
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-08T15:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders scoreboard with team data', () => {
      const game = createGame();

      const { getByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders away team abbreviation', () => {
      const game = createGame();

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('SEA')).toBeOnTheScreen();
    });

    it('renders home team abbreviation', () => {
      const game = createGame();

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('DEN')).toBeOnTheScreen();
    });

    it('renders both team helmets', () => {
      const game = createGame();

      const { getByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-away-helmet')).toBeOnTheScreen();
      expect(getByTestId('scoreboard-home-helmet')).toBeOnTheScreen();
    });

    it('subscribes to live game updates with game id', () => {
      const game = createGame({ id: 'game-456' });

      render(<PredictSportScoreboard game={game} />);

      expect(mockUseLiveGameUpdates).toHaveBeenCalledWith('game-456');
    });
  });

  describe('status="scheduled" (PreGame)', () => {
    it('displays formatted date from startTime', () => {
      const game = createGame({
        status: 'scheduled',
        startTime: '2026-02-08T20:30:00Z',
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText(/Sun, Feb 8/)).toBeOnTheScreen();
    });

    it('displays formatted time from startTime', () => {
      const game = createGame({
        status: 'scheduled',
        startTime: '2026-02-08T20:30:00Z',
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText(/PM/)).toBeOnTheScreen();
    });

    it('hides scores in pre-game state', () => {
      const game = createGame({
        status: 'scheduled',
        score: { away: 109, home: 99, raw: '109-99' },
      });

      const { queryByText } = render(<PredictSportScoreboard game={game} />);

      expect(queryByText('109')).toBeNull();
      expect(queryByText('99')).toBeNull();
    });

    it('hides possession indicator in pre-game state', () => {
      const game = createGame({ status: 'scheduled', turn: 'sea' });

      const { queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('status="ongoing" (InProgress)', () => {
    it('displays quarter and elapsed time in correct format', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q3',
        elapsed: '12:02',
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Q3 • 12:02')).toBeOnTheScreen();
    });

    it('displays only period when elapsed is null', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q4',
        elapsed: null,
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Q4')).toBeOnTheScreen();
    });

    it('displays period and elapsed time for Q1', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q1',
        elapsed: '05:30',
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Q1 • 05:30')).toBeOnTheScreen();
    });

    it('displays both team scores', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q2',
        score: { away: 109, home: 99, raw: '109-99' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('displays 0 when score is null', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q1',
        score: null,
      });

      const { getAllByText } = render(<PredictSportScoreboard game={game} />);

      expect(getAllByText('0')).toHaveLength(2);
    });

    it('displays possession indicator for away team when they have possession', () => {
      const game = createGame({ status: 'ongoing', period: 'Q3', turn: 'sea' });

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });

    it('displays possession indicator for home team when they have possession', () => {
      const game = createGame({ status: 'ongoing', period: 'Q4', turn: 'den' });

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-home-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });

    it('hides possession indicator when turn is undefined', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q1',
        turn: undefined,
      });

      const { queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });

    it('matches possession case-insensitively', () => {
      const game = createGame({ status: 'ongoing', period: 'Q2', turn: 'SEA' });

      const { getByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
    });
  });

  describe('status="ongoing" period="HT" (Halftime)', () => {
    it('displays Halftime text', () => {
      const game = createGame({ status: 'ongoing', period: 'HT' });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Halftime')).toBeOnTheScreen();
    });

    it('displays Halftime with proper period value', () => {
      const game = createGame({ status: 'ongoing', period: 'HT' });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Halftime')).toBeOnTheScreen();
    });

    it('displays scores during halftime', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'HT',
        score: { away: 14, home: 21, raw: '14-21' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('14')).toBeOnTheScreen();
      expect(getByText('21')).toBeOnTheScreen();
    });

    it('hides possession indicator during halftime', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'HT',
        turn: 'sea',
      });

      const { queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });
  });

  describe('status="ended" (Final)', () => {
    it('displays Final text', () => {
      const game = createGame({ status: 'ended' });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Final')).toBeOnTheScreen();
    });

    it('displays both team scores', () => {
      const game = createGame({
        status: 'ended',
        score: { away: 109, home: 99, raw: '109-99' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('displays winner trophy for away team when they won', () => {
      const game = createGame({
        status: 'ended',
        score: { away: 109, home: 99, raw: '109-99' },
      });

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-away-winner')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('displays winner trophy for home team when they won', () => {
      const game = createGame({
        status: 'ended',
        score: { away: 99, home: 109, raw: '99-109' },
      });

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-home-winner')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
    });

    it('hides winner trophies when game is tied', () => {
      const game = createGame({
        status: 'ended',
        score: { away: 109, home: 109, raw: '109-109' },
      });

      const { queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('hides possession indicator in final state', () => {
      const game = createGame({ status: 'ended', turn: 'sea' });

      const { queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('live updates merging', () => {
    it('uses live score when available', () => {
      const game = createGame({
        status: 'ongoing',
        score: { away: 10, home: 7, raw: '10-7' },
      });
      mockUseLiveGameUpdates.mockReturnValue(
        createLiveUpdate({
          gameUpdate: {
            gameId: 'game-123',
            score: '21-14',
            elapsed: '05:00',
            period: 'Q2',
            status: 'ongoing' as PredictGameStatus,
          },
        }),
      );

      const { getByText, queryByText } = render(
        <PredictSportScoreboard game={game} />,
      );

      expect(getByText('21')).toBeOnTheScreen();
      expect(getByText('14')).toBeOnTheScreen();
      expect(queryByText('10')).toBeNull();
      expect(queryByText('7')).toBeNull();
    });

    it('uses live status when available', () => {
      const game = createGame({ status: 'scheduled' });
      mockUseLiveGameUpdates.mockReturnValue(
        createLiveUpdate({
          gameUpdate: {
            gameId: 'game-123',
            score: '7-3',
            elapsed: '10:00',
            period: 'Q1',
            status: 'ongoing' as PredictGameStatus,
          },
        }),
      );

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Q1 • 10:00')).toBeOnTheScreen();
    });

    it('uses live period when available', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q1',
        elapsed: '15:00',
      });
      mockUseLiveGameUpdates.mockReturnValue(
        createLiveUpdate({
          gameUpdate: {
            gameId: 'game-123',
            score: '14-7',
            elapsed: '02:00',
            period: 'Q2',
            status: 'ongoing' as PredictGameStatus,
          },
        }),
      );

      const { getByText, queryByText } = render(
        <PredictSportScoreboard game={game} />,
      );

      expect(getByText('Q2 • 02:00')).toBeOnTheScreen();
      expect(queryByText('Q1')).toBeNull();
    });

    it('uses live turn when available', () => {
      const game = createGame({ status: 'ongoing', turn: 'sea' });
      mockUseLiveGameUpdates.mockReturnValue(
        createLiveUpdate({
          gameUpdate: {
            gameId: 'game-123',
            score: '14-7',
            elapsed: '05:00',
            period: 'Q2',
            status: 'ongoing' as PredictGameStatus,
            turn: 'den',
          },
        }),
      );

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard game={game} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-home-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });

    it('falls back to static game data when no live update', () => {
      const game = createGame({
        status: 'ongoing',
        period: 'Q3',
        elapsed: '12:00',
        score: { away: 21, home: 14, raw: '21-14' },
      });
      mockUseLiveGameUpdates.mockReturnValue(createLiveUpdate());

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Q3 • 12:00')).toBeOnTheScreen();
      expect(getByText('21')).toBeOnTheScreen();
      expect(getByText('14')).toBeOnTheScreen();
    });

    it('handles malformed live score string gracefully', () => {
      const game = createGame({
        status: 'ongoing',
        score: { away: 10, home: 7, raw: '10-7' },
      });
      mockUseLiveGameUpdates.mockReturnValue(
        createLiveUpdate({
          gameUpdate: {
            gameId: 'game-123',
            score: 'invalid',
            elapsed: '05:00',
            period: 'Q2',
            status: 'ongoing' as PredictGameStatus,
          },
        }),
      );

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('10')).toBeOnTheScreen();
      expect(getByText('7')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with custom team abbreviations', () => {
      const game = createGame({
        awayTeam: {
          ...createGame().awayTeam,
          abbreviation: 'KC',
        },
        homeTeam: {
          ...createGame().homeTeam,
          abbreviation: 'SF',
        },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('KC')).toBeOnTheScreen();
      expect(getByText('SF')).toBeOnTheScreen();
    });

    it('displays large scores correctly', () => {
      const game = createGame({
        status: 'ended',
        score: { away: 999, home: 888, raw: '999-888' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('999')).toBeOnTheScreen();
      expect(getByText('888')).toBeOnTheScreen();
    });

    it('renders with single-character abbreviations', () => {
      const game = createGame({
        awayTeam: { ...createGame().awayTeam, abbreviation: 'A' },
        homeTeam: { ...createGame().homeTeam, abbreviation: 'B' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('A')).toBeOnTheScreen();
      expect(getByText('B')).toBeOnTheScreen();
    });

    it('renders with long abbreviations', () => {
      const game = createGame({
        awayTeam: { ...createGame().awayTeam, abbreviation: 'LONG' },
        homeTeam: { ...createGame().homeTeam, abbreviation: 'NAME' },
      });

      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('LONG')).toBeOnTheScreen();
      expect(getByText('NAME')).toBeOnTheScreen();
    });
  });
});
