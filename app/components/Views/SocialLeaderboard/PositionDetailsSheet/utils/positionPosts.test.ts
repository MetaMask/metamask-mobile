import {
  buildComment,
  buildPosition,
  buildTrade,
} from '../positionDetailsSheet.fixtures';
import { getPositionPosts, getPositionTransactions } from './positionPosts';

describe('getPositionPosts', () => {
  it('flattens every trade comment, newest first', () => {
    const position = buildPosition({
      trades: [
        buildTrade({
          transactionHash: '0xa',
          comments: [buildComment({ uid: 'a1', timestamp: 100 })],
        }),
        buildTrade({
          transactionHash: '0xb',
          comments: [
            buildComment({ uid: 'b2', timestamp: 300 }),
            buildComment({ uid: 'b1', timestamp: 200 }),
          ],
        }),
      ],
    });

    expect(getPositionPosts(position).map((post) => post.uid)).toStrictEqual([
      'b2',
      'b1',
      'a1',
    ]);
  });

  it('lists a comment shared by two fills once', () => {
    const shared = buildComment({ uid: 'shared' });
    const position = buildPosition({
      trades: [
        buildTrade({ comments: [shared] }),
        buildTrade({ comments: [shared] }),
      ],
    });

    expect(getPositionPosts(position)).toStrictEqual([shared]);
  });

  it('returns nothing for trades without comments or a missing position', () => {
    expect(getPositionPosts(buildPosition())).toStrictEqual([]);
    expect(getPositionPosts(undefined)).toStrictEqual([]);
  });
});

describe('getPositionTransactions', () => {
  it('orders fills newest first without mutating the position', () => {
    const older = buildTrade({ transactionHash: '0xold', timestamp: 1 });
    const newer = buildTrade({ transactionHash: '0xnew', timestamp: 2 });
    const position = buildPosition({ trades: [older, newer] });

    expect(getPositionTransactions(position)).toStrictEqual([newer, older]);
    expect(position.trades).toStrictEqual([older, newer]);
  });

  it('returns nothing without a position', () => {
    expect(getPositionTransactions(undefined)).toStrictEqual([]);
  });
});
