import { sortMarketOutcomesByVolume } from './market';
import { PredictOutcome } from '..';

/**
 * Helper function to create test PredictOutcome objects
 */
const createTestOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome => ({
  id: 'test-id',
  providerId: 'test-provider',
  marketId: 'test-market',
  title: 'Test Outcome',
  description: 'Test Description',
  image: 'https://example.com/image.png',
  status: 'open',
  tokens: [],
  volume: 0,
  groupItemTitle: 'Test Group',
  ...overrides,
});

describe('sortMarketOutcomesByVolume', () => {
  it('sorts outcomes by volume in descending order', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 100 }),
      createTestOutcome({ id: 'outcome-2', volume: 500 }),
      createTestOutcome({ id: 'outcome-3', volume: 250 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(500);
    expect(result[1].volume).toBe(250);
    expect(result[2].volume).toBe(100);
    expect(result[0].id).toBe('outcome-2');
    expect(result[1].id).toBe('outcome-3');
    expect(result[2].id).toBe('outcome-1');
  });

  it('returns empty array when given empty array', () => {
    const outcomes: PredictOutcome[] = [];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('returns single outcome when given array with one item', () => {
    const outcomes = [createTestOutcome({ id: 'single', volume: 100 })];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('single');
    expect(result[0].volume).toBe(100);
  });

  it('handles outcomes with same volume values', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 100 }),
      createTestOutcome({ id: 'outcome-2', volume: 100 }),
      createTestOutcome({ id: 'outcome-3', volume: 100 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result.length).toBe(3);
    expect(result[0].volume).toBe(100);
    expect(result[1].volume).toBe(100);
    expect(result[2].volume).toBe(100);
  });

  it('handles outcomes with zero volume', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 0 }),
      createTestOutcome({ id: 'outcome-2', volume: 100 }),
      createTestOutcome({ id: 'outcome-3', volume: 0 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(100);
    expect(result[1].volume).toBe(0);
    expect(result[2].volume).toBe(0);
  });

  it('handles negative volume values', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: -50 }),
      createTestOutcome({ id: 'outcome-2', volume: 100 }),
      createTestOutcome({ id: 'outcome-3', volume: -100 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(100);
    expect(result[1].volume).toBe(-50);
    expect(result[2].volume).toBe(-100);
  });

  it('handles very large volume values', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 1000000000 }),
      createTestOutcome({ id: 'outcome-2', volume: 9999999999 }),
      createTestOutcome({ id: 'outcome-3', volume: 500000000 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(9999999999);
    expect(result[1].volume).toBe(1000000000);
    expect(result[2].volume).toBe(500000000);
  });

  it('handles decimal volume values', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 100.5 }),
      createTestOutcome({ id: 'outcome-2', volume: 200.75 }),
      createTestOutcome({ id: 'outcome-3', volume: 150.25 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(200.75);
    expect(result[1].volume).toBe(150.25);
    expect(result[2].volume).toBe(100.5);
  });

  it('mutates original array during sort', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 100 }),
      createTestOutcome({ id: 'outcome-2', volume: 200 }),
    ];
    const originalReference = outcomes;

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result).toBe(originalReference);
    expect(outcomes[0].volume).toBe(200);
    expect(outcomes[1].volume).toBe(100);
  });

  it('sorts already sorted outcomes correctly', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 300 }),
      createTestOutcome({ id: 'outcome-2', volume: 200 }),
      createTestOutcome({ id: 'outcome-3', volume: 100 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(300);
    expect(result[1].volume).toBe(200);
    expect(result[2].volume).toBe(100);
  });

  it('sorts reverse sorted outcomes correctly', () => {
    const outcomes = [
      createTestOutcome({ id: 'outcome-1', volume: 100 }),
      createTestOutcome({ id: 'outcome-2', volume: 200 }),
      createTestOutcome({ id: 'outcome-3', volume: 300 }),
    ];

    const result = sortMarketOutcomesByVolume(outcomes);

    expect(result[0].volume).toBe(300);
    expect(result[1].volume).toBe(200);
    expect(result[2].volume).toBe(100);
  });
});
