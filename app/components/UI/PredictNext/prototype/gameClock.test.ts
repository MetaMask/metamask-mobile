import { seededRandom } from './fixtures';
import {
  applyGameTick,
  footballPoints,
  gameRulesFor,
  stepClock,
  type LiveGameSnapshot,
} from './simulation';

const kickoff = (): LiveGameSnapshot => ({
  quarter: 1,
  seconds: 15 * 60,
  isFinal: false,
  awayScore: 0,
  homeScore: 0,
});

describe('football game clock', () => {
  const rules = gameRulesFor('NFL');

  it('counts down inside the quarter', () => {
    expect(stepClock(kickoff(), rules.quarterSeconds, rules.clockStep)).toEqual(
      { quarter: 1, seconds: 880, isFinal: false },
    );
  });

  it('rolls from the end of the first quarter into the second', () => {
    expect(
      stepClock(
        { quarter: 1, seconds: 20, isFinal: false },
        rules.quarterSeconds,
        rules.clockStep,
      ),
    ).toEqual({ quarter: 2, seconds: 15 * 60, isFinal: false });
  });

  it('ends the game at the end of the fourth quarter', () => {
    expect(
      stepClock(
        { quarter: 4, seconds: 20, isFinal: false },
        rules.quarterSeconds,
        rules.clockStep,
      ),
    ).toEqual({ quarter: 4, seconds: 0, isFinal: true });
  });

  it('scores only touchdowns, field goals, and safeties', () => {
    expect(footballPoints(0)).toBe(7);
    expect(footballPoints(0.6)).toBe(6);
    expect(footballPoints(0.7)).toBe(3);
    expect(footballPoints(0.96)).toBe(2);
  });

  it('plays four quarters and finishes with a football score', () => {
    const random = seededRandom(11);
    let game = kickoff();
    for (let tick = 0; tick < 400 && !game.isFinal; tick += 1) {
      game = applyGameTick(game, rules, random);
    }
    const finished = game;

    expect(finished.isFinal).toBe(true);
    expect(finished.quarter).toBe(4);
    expect(finished.awayScore).toBeGreaterThan(0);
    expect(finished.homeScore).toBeGreaterThan(0);
    expect(finished.awayScore).toBeLessThanOrEqual(rules.scoreCeiling);
    expect(finished.homeScore).toBeLessThanOrEqual(rules.scoreCeiling);
    expect(finished.awayScore % 1).toBe(0);

    const held = applyGameTick(finished, rules, random);
    expect(held).toEqual(finished);
  });
});
