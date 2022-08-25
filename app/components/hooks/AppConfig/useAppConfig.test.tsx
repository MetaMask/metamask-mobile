import { renderHook } from '@testing-library/react-hooks';
// import AppConfig from './AppConfig';
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
  // test('after a successful fetch, the AppConfig data should be available', async () => {
  //   const { result, waitForNextUpdate } = renderHook(() => useAppConfig());
  //   const expected: AppConfig = {
  //     security: {
  //       minimumVersions: {
  //         appMinimumBuild: 700,
  //         appleMinimumOS: 6,
  //         androidMinimumAPIVersion: 21,
  //       },
  //     },
  //   };
  //   await waitForNextUpdate();
  //   expect(result.all[1].type).toEqual('Success');
  //   expect(result.all[1].data).toMatchObject(expected);
  // });
});
