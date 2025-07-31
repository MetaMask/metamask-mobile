import { renderHook } from '@testing-library/react-native';
import { useDeepMemo } from './useDeepMemo';

const RESULT_MOCK = { a: 1 };
const RESULT_2_MOCK = { a: 2 };

function runHook(...args: Parameters<typeof useDeepMemo>) {
  return renderHook(
    (props: Parameters<typeof useDeepMemo>) => useDeepMemo(...props),
    { initialProps: args },
  );
}

describe('useDeepMemo', () => {
  const factoryMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    factoryMock
      .mockReturnValueOnce(RESULT_MOCK)
      .mockReturnValueOnce(RESULT_2_MOCK);
  });

  it('returns same factory result if deep equality', () => {
    const result = runHook(factoryMock, [{ b: 1 }]);
    result.rerender([factoryMock, [{ b: 1 }]]);

    expect(factoryMock).toHaveBeenCalledTimes(1);
    expect(result.result.current).toBe(RESULT_MOCK);
  });

  it('returns new factory result if not deep equality', () => {
    const result = runHook(factoryMock, [{ b: 1 }]);
    result.rerender([factoryMock, [{ b: 2 }]]);

    expect(factoryMock).toHaveBeenCalledTimes(2);
    expect(result.result.current).toBe(RESULT_2_MOCK);
  });

  it('returns same factory result if primitive dependencies not changed', () => {
    const result = runHook(factoryMock, [true, 'test', 1]);
    result.rerender([factoryMock, [true, 'test', 1]]);

    expect(factoryMock).toHaveBeenCalledTimes(1);
    expect(result.result.current).toBe(RESULT_MOCK);
  });

  it('returns new factory result if primitive dependencies changed', () => {
    const result = runHook(factoryMock, [true, 'test', 1]);
    result.rerender([factoryMock, [true, 'test', 2]]);

    expect(factoryMock).toHaveBeenCalledTimes(2);
    expect(result.result.current).toBe(RESULT_2_MOCK);
  });

  it('returns same factory result if no dependencies', () => {
    const result = runHook(factoryMock, []);
    result.rerender([factoryMock, []]);

    expect(factoryMock).toHaveBeenCalledTimes(1);
    expect(result.result.current).toBe(RESULT_MOCK);
  });
});
