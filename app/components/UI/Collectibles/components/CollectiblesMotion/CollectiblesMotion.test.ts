import {
  parseMotionMessage,
  parseCollectionCardLanded,
} from './CollectiblesMotion.types';

describe('CollectiblesMotion message boundary', () => {
  it.each(['ready', 'imageReady', 'revealed', 'completed', 'error'] as const)(
    'accepts the %s presentation notification',
    (type) => {
      expect(parseMotionMessage(JSON.stringify({ type }))).toBe(type);
    },
  );
  it.each([
    'null',
    '[]',
    '"revealed"',
    'bad json',
    '{"type":"buy"}',
    '{"type":"sign"}',
  ])('ignores unrecognized message %s', (data) => {
    expect(parseMotionMessage(data)).toBeUndefined();
  });

  it('accepts a landing only for artwork in the current scene', () => {
    const cards = [
      {
        id: 'mint-a',
        front: 'image',
        from: { left: 0, top: 0, width: 1, height: 1 },
      },
    ];
    expect(
      parseCollectionCardLanded(
        '{"type":"collectionCardLanded","id":"mint-a"}',
        cards,
      ),
    ).toBe('mint-a');
    expect(
      parseCollectionCardLanded(
        '{"type":"collectionCardLanded","id":"other-mint"}',
        cards,
      ),
    ).toBeUndefined();
    expect(
      parseCollectionCardLanded('{"type":"buy","id":"mint-a"}', cards),
    ).toBeUndefined();
    expect(
      parseCollectionCardLanded(
        '{"type":"collectionCardLanded","id":1}',
        cards,
      ),
    ).toBeUndefined();
    expect(parseCollectionCardLanded('null', cards)).toBeUndefined();
    expect(parseCollectionCardLanded('bad json', cards)).toBeUndefined();
  });
});
