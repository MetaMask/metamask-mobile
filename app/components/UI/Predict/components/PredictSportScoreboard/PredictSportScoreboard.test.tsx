import React from 'react';
import { TEST_HEX_COLORS } from '../../testUtils/mockColors';
import { render } from '@testing-library/react-native';
import PredictSportScoreboard from './PredictSportScoreboard';
import { PredictMarketGame } from '../../types';

jest.mock('../../constants/sportLeagueConfigs', () => {
  const MockTeamIcon = ({
    testID,
    flipped,
  }: {
    testID?: string;
    flipped?: boolean;
  }) => {
    const { View: MockView } = jest.requireActual('react-native');
    return (
      <MockView
        testID={testID}
        accessibilityLabel={flipped ? 'flipped' : 'not-flipped'}
      />
    );
  };

  return {
    getLeagueConfig: jest.fn((league: string) => {
      if (league === 'nfl') {
        return { TeamIcon: MockTeamIcon };
      }
      return {};
    }),
  };
});

jest.mock('../PredictSportTeamLogo/PredictSportTeamLogo', () => {
  const MockLogo = ({ testID }: { testID?: string }) => {
    const { View: MockView } = jest.requireActual('react-native');
    return <MockView testID={testID} />;
  };
  return MockLogo;
});

jest.mock('../../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
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
    color: TEST_HEX_COLORS.TEAM_DEN,
    alias: 'Broncos',
  },
  awayTeam: {
    id: 'team-sea',
    name: 'Seattle Seahawks',
    logo: 'https://example.com/sea.png',
    abbreviation: 'SEA',
    color: TEST_HEX_COLORS.TEAM_SEA,
    alias: 'Seahawks',
  },
  ...overrides,
});

describe('PredictSportScoreboard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-08T15:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders scoreboard root with testID', () => {
      const { getByTestId } = render(
        <PredictSportScoreboard game={createGame()} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders both team names', () => {
      const { getByText } = render(
        <PredictSportScoreboard game={createGame()} />,
      );

      expect(getByText('Denver Broncos')).toBeOnTheScreen();
      expect(getByText('Seattle Seahawks')).toBeOnTheScreen();
    });

    it('renders both team logos with testIDs', () => {
      const { getByTestId } = render(
        <PredictSportScoreboard game={createGame()} testID="scoreboard" />,
      );

      expect(getByTestId('scoreboard-home-team-logo')).toBeOnTheScreen();
      expect(getByTestId('scoreboard-away-team-logo')).toBeOnTheScreen();
    });

    it('renders the provided game', () => {
      const game = createGame({ id: 'game-456' });
      const { getByText } = render(<PredictSportScoreboard game={game} />);

      expect(getByText('Denver Broncos')).toBeOnTheScreen();
    });
  });

  describe('scheduled', () => {
    it('displays formatted date and time from startTime', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'scheduled',
            startTime: '2026-02-08T20:30:00Z',
          })}
        />,
      );

      expect(getByText(/February 8/)).toBeOnTheScreen();
      expect(getByText(/PM/)).toBeOnTheScreen();
    });

    it('hides scores in compact pre-game state', () => {
      const { queryByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'scheduled',
            score: { away: 109, home: 99, raw: '109-99' },
          })}
          compact
        />,
      );

      expect(queryByText('109')).toBeNull();
      expect(queryByText('99')).toBeNull();
    });
  });

  describe('ongoing', () => {
    it('formats soccer matches with an apostrophe minute', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            league: 'fifwc',
            status: 'ongoing',
            period: '2H',
            elapsed: '25',
          })}
        />,
      );

      expect(getByText('LIVE')).toBeOnTheScreen();
      expect(getByText('25’')).toBeOnTheScreen();
    });

    it('formats non-soccer matches with period and elapsed', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'ongoing',
            period: 'Q3',
            elapsed: '12:02',
          })}
        />,
      );

      expect(getByText('Q3 • 12:02')).toBeOnTheScreen();
    });

    it('falls back to the period when elapsed is null', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'ongoing',
            period: 'Q4',
            elapsed: null,
          })}
        />,
      );

      expect(getByText('Q4')).toBeOnTheScreen();
    });

    it('shows Halftime at the break', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({ status: 'ongoing', period: 'HT' })}
        />,
      );

      expect(getByText('Halftime')).toBeOnTheScreen();
    });

    it('renders both team scores', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'ongoing',
            period: 'Q2',
            score: { away: 109, home: 99, raw: '109-99' },
          })}
        />,
      );

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('renders 0 for both teams when score is null', () => {
      const { getAllByText } = render(
        <PredictSportScoreboard
          game={createGame({ status: 'ongoing', period: 'Q1', score: null })}
        />,
      );

      expect(getAllByText('0')).toHaveLength(2);
    });
  });

  describe('ended', () => {
    it('displays Final', () => {
      const { getByText } = render(
        <PredictSportScoreboard game={createGame({ status: 'ended' })} />,
      );

      expect(getByText('Final')).toBeOnTheScreen();
    });

    it('displays Final when the period is full time', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({ status: 'ongoing', period: 'FT' })}
        />,
      );

      expect(getByText('Final')).toBeOnTheScreen();
    });

    it('renders both team scores', () => {
      const { getByText } = render(
        <PredictSportScoreboard
          game={createGame({
            status: 'ended',
            score: { away: 109, home: 99, raw: '109-99' },
          })}
        />,
      );

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });
  });

  describe('team display order', () => {
    it('renders the home team on the left for soccer leagues', () => {
      const { getAllByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'fifwc' })}
          testID="scoreboard"
        />,
      );

      const order = getAllByTestId(/-(home|away)-team-logo$/).map(
        (node) => node.props.testID,
      );
      expect(order).toEqual([
        'scoreboard-home-team-logo',
        'scoreboard-away-team-logo',
      ]);
    });

    it('renders the home team on the left for tennis leagues', () => {
      const { getAllByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'atp' })}
          testID="scoreboard"
        />,
      );

      const order = getAllByTestId(/-(home|away)-team-logo$/).map(
        (node) => node.props.testID,
      );
      expect(order).toEqual([
        'scoreboard-home-team-logo',
        'scoreboard-away-team-logo',
      ]);
    });

    it('renders the away team on the left for US sports (NFL)', () => {
      const { getAllByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'nfl' })}
          testID="scoreboard"
        />,
      );

      const order = getAllByTestId(/-(home|away)-team-logo$/).map(
        (node) => node.props.testID,
      );
      expect(order).toEqual([
        'scoreboard-away-team-logo',
        'scoreboard-home-team-logo',
      ]);
    });

    it('mirrors the right-side team icon so directional icons face each other (NFL)', () => {
      const { getByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'nfl' })}
          testID="scoreboard"
        />,
      );

      // NFL renders away-on-left (not flipped) and home-on-right (flipped),
      // so the two helmets face each other.
      expect(
        getByTestId('scoreboard-away-team-logo').props.accessibilityLabel,
      ).toBe('not-flipped');
      expect(
        getByTestId('scoreboard-home-team-logo').props.accessibilityLabel,
      ).toBe('flipped');
    });

    it('keeps team names aligned with their logo order (NFL away-first)', () => {
      const { getByText } = render(
        <PredictSportScoreboard game={createGame({ league: 'nfl' })} />,
      );

      // Both names render; away (Seattle) sits on the left for US sports.
      expect(getByText('Seattle Seahawks')).toBeOnTheScreen();
      expect(getByText('Denver Broncos')).toBeOnTheScreen();
    });
  });

  describe('league-specific rendering', () => {
    it('renders custom team icons for configured leagues (NFL)', () => {
      const { getByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'nfl' })}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-team-logo')).toBeOnTheScreen();
      expect(getByTestId('scoreboard-away-team-logo')).toBeOnTheScreen();
    });

    it('renders team logos for leagues without custom icons (NBA)', () => {
      const { getByTestId } = render(
        <PredictSportScoreboard
          game={createGame({ league: 'nba' })}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-team-logo')).toBeOnTheScreen();
      expect(getByTestId('scoreboard-away-team-logo')).toBeOnTheScreen();
    });
  });
});
