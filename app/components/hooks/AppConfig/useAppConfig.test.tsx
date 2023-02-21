import { renderHook } from '@testing-library/react-hooks';
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
    await waitForNextUpdate();
    expect(result.all[1].type).toEqual('Success');
    expect(
      result.all[1].data.security.minimumVersions.appMinimumBuild,
    ).toBeDefined();
    expect(
      result.all[1].data.security.minimumVersions.appleMinimumOS,
    ).toBeDefined();
    expect(
      result.all[1].data.security.minimumVersions.androidMinimumAPIVersion,
    ).toBeDefined();
  });
});
