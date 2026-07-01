/**
 * @jest-environment jsdom
 */
import {
  getPositionShapeIds,
  pushPositionShapeId,
  clearPositionShapeIds,
  __resetPositionLineStateForTests,
} from '../state';
import type { TVShapeId } from '../../../core/types';

describe('positionLines/state', () => {
  beforeEach(() => {
    __resetPositionLineStateForTests();
  });

  it('starts empty', () => {
    expect(getPositionShapeIds()).toEqual([]);
  });

  it('pushPositionShapeId appends IDs', () => {
    pushPositionShapeId('shape-1' as TVShapeId);
    pushPositionShapeId('shape-2' as TVShapeId);
    expect(getPositionShapeIds()).toEqual(['shape-1', 'shape-2']);
  });

  it('clearPositionShapeIds empties the list', () => {
    pushPositionShapeId('shape-1' as TVShapeId);
    pushPositionShapeId('shape-2' as TVShapeId);
    clearPositionShapeIds();
    expect(getPositionShapeIds()).toEqual([]);
  });

  it('__resetPositionLineStateForTests resets to empty', () => {
    pushPositionShapeId('shape-1' as TVShapeId);
    __resetPositionLineStateForTests();
    expect(getPositionShapeIds()).toEqual([]);
  });
});
