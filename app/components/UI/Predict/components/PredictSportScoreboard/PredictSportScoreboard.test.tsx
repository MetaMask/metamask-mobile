import React from 'react';
import { render } from '@testing-library/react-native';
import PredictSportScoreboard from './PredictSportScoreboard';
import { PredictSportTeam } from '../../types';

type TeamData = Pick<PredictSportTeam, 'abbreviation' | 'color'>;

// Mock child components
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

// Mock i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'predict.sports.halftime': 'Halftime',
      'predict.sports.final': 'Final',
    };
    return translations[key] || key;
  },
}));

const createAwayTeam = (overrides: Partial<TeamData> = {}): TeamData => ({
  abbreviation: 'SEA',
  color: '#002244',
  ...overrides,
});

const createHomeTeam = (overrides: Partial<TeamData> = {}): TeamData => ({
  abbreviation: 'DEN',
  color: '#FB4F14',
  ...overrides,
});

describe('PredictSportScoreboard', () => {
  describe('rendering', () => {
    it('renders scoreboard with team data', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders away team abbreviation', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
        />,
      );

      expect(getByText('SEA')).toBeOnTheScreen();
    });

    it('renders home team abbreviation', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
        />,
      );

      expect(getByText('DEN')).toBeOnTheScreen();
    });
  });

  describe('gameStatus="scheduled" (PreGame)', () => {
    it('displays event title when provided', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();
      const eventTitle = 'Super Bowl LX';

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          eventTitle={eventTitle}
        />,
      );

      expect(getByText(eventTitle)).toBeOnTheScreen();
    });

    it('displays date when provided', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();
      const date = 'Sun, Feb 8';

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          date={date}
        />,
      );

      expect(getByText(date)).toBeOnTheScreen();
    });

    it('displays time when provided', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();
      const time = '3:30 PM EST';

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          time={time}
        />,
      );

      expect(getByText(time)).toBeOnTheScreen();
    });

    it('hides scores in pre-game state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          awayScore={109}
          homeScore={99}
        />,
      );

      expect(queryByText('109')).toBeNull();
      expect(queryByText('99')).toBeNull();
    });

    it('hides possession indicator in pre-game state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('gameStatus="ongoing" (InProgress)', () => {
    it('displays quarter and time in correct format', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          quarter="Q3"
          time="12:02"
        />,
      );

      expect(getByText('Q3 • 12:02')).toBeOnTheScreen();
    });

    it('displays both team scores', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          awayScore={109}
          homeScore={99}
        />,
      );

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('displays possession indicator for away team when they have possession', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
    });

    it('displays possession indicator for home team when they have possession', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn="den"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-possession')).toBeOnTheScreen();
    });

    it('hides possession indicator when possession is None', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn={undefined}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });

    it('displays only one possession indicator at a time', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });
  });

  describe('gameStatus="ongoing" period="HT" (Halftime)', () => {
    it('displays Halftime text', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          period="HT"
        />,
      );

      expect(getByText('Halftime')).toBeOnTheScreen();
    });

    it('displays both team scores', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          period="HT"
          awayScore={109}
          homeScore={99}
        />,
      );

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('hides possession indicator in halftime state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          period="HT"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('gameStatus="ended" (Final)', () => {
    it('displays Final text', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
        />,
      );

      expect(getByText('Final')).toBeOnTheScreen();
    });

    it('displays both team scores', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={99}
        />,
      );

      expect(getByText('109')).toBeOnTheScreen();
      expect(getByText('99')).toBeOnTheScreen();
    });

    it('hides possession indicator in final state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('team helmets', () => {
    it('renders away team helmet with correct color', () => {
      const awayTeam = createAwayTeam({ color: '#002244' });
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-helmet')).toBeOnTheScreen();
    });

    it('renders home team helmet with correct color', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam({ color: '#FB4F14' });

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-helmet')).toBeOnTheScreen();
    });

    it('renders both team helmets simultaneously', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-helmet')).toBeOnTheScreen();
      expect(getByTestId('scoreboard-home-helmet')).toBeOnTheScreen();
    });
  });

  describe('score display', () => {
    it('displays 0 when awayScore is undefined in active game', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          homeScore={99}
        />,
      );

      expect(getByText('0')).toBeOnTheScreen();
    });

    it('displays 0 when homeScore is undefined in active game', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          awayScore={109}
        />,
      );

      expect(getByText('0')).toBeOnTheScreen();
    });

    it('displays both scores as 0 when neither score provided', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getAllByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
        />,
      );

      const zeros = getAllByText('0');
      expect(zeros).toHaveLength(2);
    });

    it('displays large scores correctly', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={999}
          homeScore={888}
        />,
      );

      expect(getByText('999')).toBeOnTheScreen();
      expect(getByText('888')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with custom team abbreviations', () => {
      const awayTeam = createAwayTeam({ abbreviation: 'KC' });
      const homeTeam = createHomeTeam({ abbreviation: 'SF' });

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
        />,
      );

      expect(getByText('KC')).toBeOnTheScreen();
      expect(getByText('SF')).toBeOnTheScreen();
    });

    it('renders with hex colors including alpha channel', () => {
      const awayTeam = createAwayTeam({ color: '#002244FF' });
      const homeTeam = createHomeTeam({ color: '#FB4F14FF' });

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders with short hex color format', () => {
      const awayTeam = createAwayTeam({ color: '#FFF' });
      const homeTeam = createHomeTeam({ color: '#000' });

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('displays only quarter when time is not provided in in-progress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          quarter="Q4"
        />,
      );

      expect(getByText('Q4')).toBeOnTheScreen();
    });

    it('displays only time when quarter is not provided in in-progress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          time="12:02"
        />,
      );

      expect(getByText('12:02')).toBeOnTheScreen();
    });

    it('renders with single-character team abbreviations', () => {
      const awayTeam = createAwayTeam({ abbreviation: 'A' });
      const homeTeam = createHomeTeam({ abbreviation: 'B' });

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
        />,
      );

      expect(getByText('A')).toBeOnTheScreen();
      expect(getByText('B')).toBeOnTheScreen();
    });

    it('renders with long team abbreviations', () => {
      const awayTeam = createAwayTeam({ abbreviation: 'LONG' });
      const homeTeam = createHomeTeam({ abbreviation: 'NAME' });

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
        />,
      );

      expect(getByText('LONG')).toBeOnTheScreen();
      expect(getByText('NAME')).toBeOnTheScreen();
    });
  });

  describe('all game states', () => {
    it('hides scores in PreGame state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          awayScore={10}
          homeScore={7}
        />,
      );

      expect(queryByText('10')).toBeNull();
      expect(queryByText('7')).toBeNull();
    });

    it('displays scores in InProgress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          awayScore={14}
          homeScore={21}
        />,
      );

      expect(getByText('14')).toBeOnTheScreen();
      expect(getByText('21')).toBeOnTheScreen();
    });

    it('displays Halftime label in Halftime state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          period="HT"
        />,
      );

      expect(getByText('Halftime')).toBeOnTheScreen();
    });

    it('displays Final label in Final state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
        />,
      );

      expect(getByText('Final')).toBeOnTheScreen();
    });
  });

  describe('possession states', () => {
    it('shows possession icon for away team when possession is Away', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn="sea"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });

    it('shows possession icon for home team when possession is Home', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn="den"
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });

    it('hides possession icons when possession is None', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          turn={undefined}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });
  });

  describe('winner trophy display', () => {
    it('displays winner trophy for away team when they won in final state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={99}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-winner')).toBeOnTheScreen();
    });

    it('displays winner trophy for home team when they won in final state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={99}
          homeScore={109}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-winner')).toBeOnTheScreen();
    });

    it('hides winner trophy when winner is None in final state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={109}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('displays only one winner trophy at a time', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={99}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-winner')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('hides winner trophy in PreGame state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="scheduled"
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('hides winner trophy in InProgress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          awayScore={109}
          homeScore={99}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('hides winner trophy in Halftime state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ongoing"
          period="HT"
          awayScore={109}
          homeScore={99}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });
  });

  describe('winner states', () => {
    it('shows winner trophy for away team when winner is Away', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={99}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-winner')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });

    it('shows winner trophy for home team when winner is Home', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId, queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={99}
          homeScore={109}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-home-winner')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
    });

    it('hides winner trophies when winner is None', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameStatus="ended"
          awayScore={109}
          homeScore={109}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-winner')).toBeNull();
      expect(queryByTestId('scoreboard-home-winner')).toBeNull();
    });
  });
});
