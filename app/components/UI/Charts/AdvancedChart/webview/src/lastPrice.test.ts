import { setState, resetState, getState } from './state';
import { sweepNonPositionHorizontalLines } from './lastPrice';

beforeEach(() => {
  resetState();
});

describe('sweepNonPositionHorizontalLines', () => {
  it('removes horizontal lines that are not position lines', () => {
    const removeEntity = jest.fn();
    setState({
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [
            { id: 'h1', name: 'horizontal_line' },
            { id: 'p1', name: 'horizontal_line' },
            { id: 'x1', name: 'icon' },
          ],
          removeEntity,
        }),
      },
      isChartReady: true,
      positionShapeIds: ['p1'],
    });

    sweepNonPositionHorizontalLines();

    expect(removeEntity).toHaveBeenCalledWith('h1');
    expect(removeEntity).not.toHaveBeenCalledWith('p1');
    expect(removeEntity).not.toHaveBeenCalledWith('x1');
  });

  it('does nothing when no chart widget', () => {
    setState({ chartWidget: null, isChartReady: false });
    expect(() => sweepNonPositionHorizontalLines()).not.toThrow();
  });

  it('does nothing when chart is not ready', () => {
    setState({
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [],
          removeEntity: jest.fn(),
        }),
      },
      isChartReady: false,
    });
    expect(() => sweepNonPositionHorizontalLines()).not.toThrow();
  });

  it('handles shapes with no horizontal matches', () => {
    const removeEntity = jest.fn();
    setState({
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [
            { id: 's1', name: 'icon' },
            { id: 's2', name: 'trend_line' },
          ],
          removeEntity,
        }),
      },
      isChartReady: true,
      positionShapeIds: [],
    });

    sweepNonPositionHorizontalLines();
    expect(removeEntity).not.toHaveBeenCalled();
  });

  it('handles empty shapes array', () => {
    const removeEntity = jest.fn();
    setState({
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [],
          removeEntity,
        }),
      },
      isChartReady: true,
      positionShapeIds: [],
    });

    sweepNonPositionHorizontalLines();
    expect(removeEntity).not.toHaveBeenCalled();
  });
});
