import indexFrames from './fixtures/index-topic-frames.json';
import { parsePredictLiveDataServerFrame } from './liveData';

describe('index topic frames', () => {
  it('parses the welcome frame with the index limits', () => {
    expect(parsePredictLiveDataServerFrame(indexFrames.welcome)).toMatchObject({
      type: 'welcome',
      limits: { index: { maxPerConnection: 8, maxPerMessage: 4 } },
    });
  });

  it('parses the subscribed frame of the index topic', () => {
    expect(parsePredictLiveDataServerFrame(indexFrames.subscribed)).toEqual(
      indexFrames.subscribed,
    );
  });

  it('parses an index snapshot with its points', () => {
    const frame = parsePredictLiveDataServerFrame(indexFrames.snapshot);

    expect(frame).toEqual(indexFrames.snapshot);
  });

  it('parses a snapshot that omits the raw value', () => {
    const frame = parsePredictLiveDataServerFrame(
      indexFrames.snapshotWithoutRawValue,
    );

    expect(frame).toMatchObject({
      type: 'index_snapshot',
      index: { average60s: '60512.84' },
    });
    expect(frame?.type === 'index_snapshot' && frame.index.value).toBe(
      undefined,
    );
  });

  it('parses a tick that has no raw value', () => {
    const frame = parsePredictLiveDataServerFrame(
      indexFrames.updateWithoutRawValue,
    );

    expect(frame?.type).toBe('index');
    expect(frame?.type === 'index' && frame.index.value).toBe(undefined);
  });

  it('parses a snapshot that already carries the final settlement average', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.snapshotAfterFinal),
    ).toMatchObject({
      type: 'index_snapshot',
      index: { settlementAverage: { samples: 60, final: true } },
    });
  });

  it('parses the too_many_events error frame', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.errorTooManyEvents),
    ).toMatchObject({ type: 'error', code: 'too_many_events' });
  });

  it('parses a live tick', () => {
    expect(parsePredictLiveDataServerFrame(indexFrames.update)).toEqual(
      indexFrames.update,
    );
  });

  it('parses the settlement average and its final tick', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.settlementUpdate),
    ).toMatchObject({
      index: { settlementAverage: { samples: 59, final: false } },
    });
    expect(
      parsePredictLiveDataServerFrame(indexFrames.finalUpdate),
    ).toMatchObject({
      index: { settlementAverage: { samples: 60, final: true } },
    });
  });

  it('parses the index error codes as error frames with the index topic', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.errorNoLiveData),
    ).toMatchObject({ type: 'error', code: 'no_live_data', topic: 'index' });
    expect(
      parsePredictLiveDataServerFrame(indexFrames.errorUpstreamStale),
    ).toMatchObject({ type: 'error', code: 'upstream_stale', topic: 'index' });
  });

  it('parses too_many_events with the refused Event ids', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.errorTooManyEvents),
    ).toMatchObject({
      code: 'too_many_events',
      topic: 'index',
      events: ['KXBTC15M-26NOV261815'],
    });
  });

  it('parses an error frame without a topic', () => {
    const frame = parsePredictLiveDataServerFrame(
      indexFrames.errorWithoutTopic,
    );

    expect(frame).toMatchObject({ type: 'error', code: 'no_live_data' });
    expect(frame?.type === 'error' && frame.topic).toBe(undefined);
  });

  it('parses a connection-level error frame with no events', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.errorOtherTopic),
    ).toMatchObject({ type: 'error', code: 'unknown_venue' });
  });

  it.each(['window_closed', 'unavailable'])(
    'parses a server-initiated unsubscribed frame with reason %s',
    (reason) => {
      const frame = {
        ...indexFrames.unsubscribedByServer,
        reason,
      };

      expect(parsePredictLiveDataServerFrame(frame)).toEqual(frame);
    },
  );

  it('parses an unsubscribed acknowledgement without a reason', () => {
    const frame = parsePredictLiveDataServerFrame(indexFrames.unsubscribedAck);

    expect(frame).toMatchObject({ type: 'unsubscribed', topic: 'index' });
    expect(frame).not.toHaveProperty('reason');
  });

  it('parses an acknowledgement with an empty events list', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.unsubscribedAckEmpty),
    ).toMatchObject({ type: 'unsubscribed', events: [] });
  });

  it('parses a final tick with 59 samples', () => {
    expect(
      parsePredictLiveDataServerFrame(indexFrames.finalUpdateWith59Samples),
    ).toMatchObject({
      index: { settlementAverage: { samples: 59, final: true } },
    });
  });

  it('keeps unknown fields from rejecting a frame', () => {
    const frame = parsePredictLiveDataServerFrame({
      ...indexFrames.update,
      index: { ...indexFrames.update.index, futureField: 1 },
    });

    expect(frame?.type).toBe('index');
  });

  it.each([
    ['a numeric average', { average60s: 60513.4 }],
    ['an exponent average', { average60s: '6.05e4' }],
    ['a negative average', { average60s: '-1' }],
    ['a bad observation time', { observedAt: 'now' }],
    ['a missing average', { average60s: undefined }],
  ])('rejects a tick with %s', (_name, overrides) => {
    const frame = parsePredictLiveDataServerFrame({
      ...indexFrames.update,
      index: { ...indexFrames.update.index, ...overrides },
    });

    expect(frame).toBeUndefined();
  });

  it('rejects a snapshot with a bad point', () => {
    const frame = parsePredictLiveDataServerFrame({
      ...indexFrames.snapshot,
      index: {
        ...indexFrames.snapshot.index,
        points: [{ time: 'yesterday', value: '1' }],
      },
    });

    expect(frame).toBeUndefined();
  });
});
