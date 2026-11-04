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
          comments: [buildComment({ uid: 'a1', timestamp: 100 })],
        }),
        buildTrade({
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
    const shared = buildComment({ uid: 'shared' });
    const duplicatePosition = buildPosition({
      trades: [
        buildTrade({ comments: [shared] }),
        buildTrade({ comments: [shared] }),
      ],
    });
    expect(getPositionPosts(duplicatePosition)).toStrictEqual([shared]);
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
});
