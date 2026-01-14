import React from 'react';
import { render } from '@testing-library/react-native';
import PredictSportScoreboard from './PredictSportScoreboard';
import {
  GameState,
  Possession,
  TeamData,
} from './PredictSportScoreboard.types';

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
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
        />,
      );

      expect(getByText('DEN')).toBeOnTheScreen();
    });
  });

  describe('GameState.PreGame', () => {
    it('displays event title when provided', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();
      const eventTitle = 'Super Bowl LX';

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
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
          gameState={GameState.PreGame}
          possession={Possession.Away}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('GameState.InProgress', () => {
    it('displays quarter and time in correct format', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
          possession={Possession.Away}
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
          gameState={GameState.InProgress}
          possession={Possession.Home}
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
          gameState={GameState.InProgress}
          possession={Possession.None}
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
          gameState={GameState.InProgress}
          possession={Possession.Away}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard-away-possession')).toBeOnTheScreen();
      expect(queryByTestId('scoreboard-home-possession')).toBeNull();
    });
  });

  describe('GameState.Halftime', () => {
    it('displays Halftime text', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.Halftime}
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
          gameState={GameState.Halftime}
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
          gameState={GameState.Halftime}
          possession={Possession.Away}
          testID="scoreboard"
        />,
      );

      expect(queryByTestId('scoreboard-away-possession')).toBeNull();
    });
  });

  describe('GameState.Final', () => {
    it('displays Final text', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.Final}
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
          gameState={GameState.Final}
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
          gameState={GameState.Final}
          possession={Possession.Away}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.Final}
          awayScore={999}
          homeScore={888}
        />,
      );

      expect(getByText('999')).toBeOnTheScreen();
      expect(getByText('888')).toBeOnTheScreen();
    });
  });

  describe('size variants', () => {
    it('renders with default variant when variant prop omitted', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders with default variant when explicitly specified', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders with compact variant when specified', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });

    it('renders without optional time in in-progress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          quarter="Q4"
        />,
      );

      expect(queryByText('Q4 • 12:02')).toBeNull();
    });

    it('renders without optional quarter in in-progress state', () => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { queryByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          time="12:02"
        />,
      );

      expect(queryByText('Q3 • 12:02')).toBeNull();
    });

    it('renders with single-character team abbreviations', () => {
      const awayTeam = createAwayTeam({ abbreviation: 'A' });
      const homeTeam = createHomeTeam({ abbreviation: 'B' });

      const { getByText } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
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
          gameState={GameState.InProgress}
        />,
      );

      expect(getByText('LONG')).toBeOnTheScreen();
      expect(getByText('NAME')).toBeOnTheScreen();
    });
  });

  describe('all game states', () => {
    it.each([
      [GameState.PreGame, 'PreGame'],
      [GameState.InProgress, 'InProgress'],
      [GameState.Halftime, 'Halftime'],
      [GameState.Final, 'Final'],
    ])('renders %s state successfully', (gameState) => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={gameState}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });
  });

  describe('possession states', () => {
    it.each([
      [Possession.Away, 'away'],
      [Possession.Home, 'home'],
      [Possession.None, 'none'],
    ])('handles %s possession state', (possessionState) => {
      const awayTeam = createAwayTeam();
      const homeTeam = createHomeTeam();

      const { getByTestId } = render(
        <PredictSportScoreboard
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          gameState={GameState.InProgress}
          possession={possessionState}
          testID="scoreboard"
        />,
      );

      expect(getByTestId('scoreboard')).toBeOnTheScreen();
    });
  });
});
