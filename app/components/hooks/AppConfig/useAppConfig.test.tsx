import { renderHook } from '@testing-library/react-hooks';
import useAppConfig from './useAppConfig';

describe('useAppConfig', () => {
  test('it should start with a state of "Loading"', () => {
    const { result } = renderHook(() => useAppConfig());
    expect(result.current.type).toEqual('Loading');
  });

  test('it should return a state of "Success"', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAppConfig());
    expect(result.current.type).toBe('Loading');
    await waitForNextUpdate();
    expect(result.all[1].type).toEqual('Success');
  });
});
