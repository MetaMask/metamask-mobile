import type { Mockttp } from 'mockttp';
import {
  assertCapturedMetaMetricsEvents,
  deriveEventNamesForFetch,
  shouldRunAnalyticsExpectations,
} from './runAnalyticsExpectations';
import type { AnalyticsExpectations } from '../../framework';
import type { EventPayload } from './helpers';

const mockServer = {} as Mockttp;

describe('shouldRunAnalyticsExpectations', () => {
  it('returns false for undefined', () => {
    expect(shouldRunAnalyticsExpectations(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(shouldRunAnalyticsExpectations({})).toBe(false);
  });

  it('returns true when validate is set', () => {
    expect(
      shouldRunAnalyticsExpectations({
        validate: async () => undefined,
      }),
    ).toBe(true);
  });

  it('returns true when expectedTotalCount is set including zero', () => {
    expect(shouldRunAnalyticsExpectations({ expectedTotalCount: 0 })).toBe(
      true,
    );
  });

  it('returns true when events array is non-empty', () => {
    expect(
      shouldRunAnalyticsExpectations({
        events: [{ name: 'Test Event' }],
      }),
    ).toBe(true);
  });

  it('returns true when eventNames is non-empty', () => {
    expect(
      shouldRunAnalyticsExpectations({
        eventNames: ['A'],
      }),
    ).toBe(true);
  });
});

describe('deriveEventNamesForFetch', () => {
  it('prefers explicit eventNames', () => {
    const expectations: AnalyticsExpectations = {
      eventNames: ['One', 'Two'],
      events: [{ name: 'Three' }],
    };
    expect(deriveEventNamesForFetch(expectations)).toEqual(['One', 'Two']);
  });

  it('uses unique names from events when eventNames missing', () => {
    const expectations: AnalyticsExpectations = {
      events: [{ name: 'Dup' }, { name: 'Dup' }, { name: 'Other' }],
    };
    expect(deriveEventNamesForFetch(expectations)).toEqual(['Dup', 'Other']);
  });

  it('returns empty array when no names source', () => {
    expect(
      deriveEventNamesForFetch({ validate: async () => undefined }),
    ).toEqual([]);
  });
});

describe('assertCapturedMetaMetricsEvents', () => {
  const sample: EventPayload[] = [
    { event: 'Alpha', properties: { x: 'a' } },
    { event: 'Alpha', properties: { x: 'b' } },
  ];

  it('throws when expectedTotalCount does not match', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        sample,
        { expectedTotalCount: 99 },
        mockServer,
      ),
    ).rejects.toThrow();
  });

  it('passes when expectedTotalCount matches', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        sample,
        { expectedTotalCount: 2 },
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });

  it('throws when minCount not met for an event', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        sample,
        {
          events: [{ name: 'Missing', minCount: 1 }],
        },
        mockServer,
      ),
    ).rejects.toThrow(/Missing/);
  });

  it('validates requiredProperties on each matching payload', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        sample,
        {
          events: [
            {
              name: 'Alpha',
              minCount: 2,
              requiredProperties: { x: 'string' },
            },
          ],
        },
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });

  it('runs validate in the same SoftAssert pass as declarative checks', async () => {
    let ran = false;
    await assertCapturedMetaMetricsEvents(
      [{ event: 'Z', properties: {} }],
      {
        expectedTotalCount: 1,
        validate: async () => {
          ran = true;
        },
      },
      mockServer,
    );
    expect(ran).toBe(true);
  });

  it('still runs validate when declarative checks failed and aggregates errors', async () => {
    let ran = false;
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'Z', properties: {} }],
        {
          expectedTotalCount: 99,
          validate: async () => {
            ran = true;
            throw new Error('validate failed');
          },
        },
        mockServer,
      ),
    ).rejects.toThrow(/validate failed/);
    expect(ran).toBe(true);
  });

  it('evaluates every expected event and reports all failures together', async () => {
    let caught: Error | undefined;
    try {
      await assertCapturedMetaMetricsEvents(
        [{ event: 'OnlyThis', properties: {} }],
        {
          events: [
            { name: 'MissingOne', minCount: 1 },
            {
              name: 'OnlyThis',
              matchProperties: { wrong: true },
            },
          ],
        },
        mockServer,
      );
    } catch (error) {
      caught = error as Error;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).toContain('MissingOne');
    expect(caught?.message).toContain('OnlyThis');
    expect(caught?.message).toContain('match expected object');
  });

  it('validates matchProperties on target payload', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'E', properties: { id: 1, name: 'ok' } }],
        {
          events: [
            {
              name: 'E',
              matchProperties: { id: 1, name: 'ok' },
            },
          ],
        },
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });

  it('fails matchProperties when values differ', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'E', properties: { id: 2 } }],
        {
          events: [
            {
              name: 'E',
              matchProperties: { id: 1 },
            },
          ],
        },
        mockServer,
      ),
    ).rejects.toThrow();
  });

  it('validates containProperties', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'E', properties: { a: 1, b: 2 } }],
        {
          events: [
            {
              name: 'E',
              containProperties: { b: 2 },
            },
          ],
        },
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });

  it('validates requiredDefinedPropertyKeys', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'E', properties: { x: 'set' } }],
        {
          events: [
            {
              name: 'E',
              requiredDefinedPropertyKeys: ['x'],
            },
          ],
        },
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });

  it('fails requiredDefinedPropertyKeys when key missing', async () => {
    await expect(
      assertCapturedMetaMetricsEvents(
        [{ event: 'E', properties: {} }],
        {
          events: [
            {
              name: 'E',
              requiredDefinedPropertyKeys: ['missing'],
            },
          ],
        },
        mockServer,
      ),
    ).rejects.toThrow();
  });
});
