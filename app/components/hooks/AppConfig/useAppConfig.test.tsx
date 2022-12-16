import { renderHook } from '@testing-library/react-hooks';
import AppConfig from './AppConfig';
import useAppConfig from './useAppConfig';

describe('useAppConfig', () => {
  test('it should start with a state of "Loading"', () => {
    const hasGithubPermissions = true;
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    expect(result.current.type).toEqual('Loading');
  });
  test('it should return an error when hasGithubPermissions is false', async () => {
    const hasGithubPermissions = false;
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    expect(result.all[1].type).toEqual('Error');
  });
  test('it should not call fetch when hasGithubPermissions is false', async () => {
    const hasGithubPermissions = false;
    const spy = jest.spyOn(global, 'fetch');
    renderHook(() => useAppConfig(hasGithubPermissions));
    expect(spy).toHaveBeenCalledTimes(0);
  });
  test('it should call fetch when hasGithubPermissions is true', async () => {
    const hasGithubPermissions = true;
    const spy = jest.spyOn(global, 'fetch');
    renderHook(() => useAppConfig(hasGithubPermissions));
    expect(spy).toHaveBeenCalledTimes(1);
  });
  test('it should return a state of "Success"', async () => {
    const hasGithubPermissions = true;
    const { result, waitForNextUpdate } = renderHook(() =>
      useAppConfig(hasGithubPermissions),
    );
    expect(result.current.type).toBe('Loading');
    await waitForNextUpdate();
    expect(result.all[1].type).toEqual('Success');
  });
  test('after a successful fetch, the AppConfig data should be available', async () => {
    const hasGithubPermissions = true;
    const { result, waitForNextUpdate } = renderHook(() =>
      useAppConfig(hasGithubPermissions),
    );
    const expected: AppConfig = {
      security: {
        minimumVersions: {
          appMinimumBuild: 700,
          appleMinimumOS: 6,
          androidMinimumAPIVersion: 21,
        },
      },
    };
    await waitForNextUpdate();
    expect(result.all[1].type).toEqual('Success');
    expect(result.all[1].data).toMatchObject(expected);
  });
});
