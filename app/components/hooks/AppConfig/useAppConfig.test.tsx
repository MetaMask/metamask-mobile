import { renderHook, waitFor } from '@testing-library/react-native';
import useAppConfig from './useAppConfig';

describe('useAppConfig', () => {
  const mockFetch = jest.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          security: {
            minimumVersions: {
              appMinimumBuild: '1',
              appleMinimumOS: '2',
              androidMinimumAPIVersion: '3',
            },
          },
        }),
    }),
  );
  beforeAll(() => {
    global.fetch = mockFetch;
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    mockFetch.mockRestore();
  });
  test('it should start with a state of "Loading"', () => {
    const hasGithubPermissions = true;
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    expect(result.current.type).toEqual('Loading');
  });
  test('it should return an error when hasGithubPermissions is false', async () => {
    const hasGithubPermissions = false;
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    expect(result.current.type).toEqual('Error');
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
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    expect(result.current.type).toBe('Loading');
    await waitFor(() => {
      expect(result.current.type).toEqual('Success');
    });
  });
  test('after a successful fetch, the AppConfig data should be available', async () => {
    const hasGithubPermissions = true;
    const { result } = renderHook(() => useAppConfig(hasGithubPermissions));
    await waitFor(() => {
      expect(result.current.type).toEqual('Success');
      expect(
        result.current.data?.security.minimumVersions.appMinimumBuild,
      ).toBeDefined();
      expect(
        result.current.data?.security.minimumVersions.appleMinimumOS,
      ).toBeDefined();
      expect(
        result.current.data?.security.minimumVersions.androidMinimumAPIVersion,
      ).toBeDefined();
    });
  });
});
