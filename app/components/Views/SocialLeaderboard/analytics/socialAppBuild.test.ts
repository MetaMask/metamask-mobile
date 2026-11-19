describe('socialAppBuild', () => {
  const load = async () => {
    jest.resetModules();
    return import('./socialAppBuild');
  };
  it('omits the property when the native version is not a string', async () => {
    jest.doMock('react-native-device-info', () => ({
      getVersion: () => Promise.resolve('version'),
    }));
    const { readSocialAppBuild, withSocialAppBuild } = await load();
    expect(readSocialAppBuild()).toBeUndefined();
    expect(withSocialAppBuild({ screen_name: 'trending' })).toEqual({
      screen_name: 'trending',
    });
  });
  it('attaches the formatted version and reads it once', async () => {
    const getVersion = jest.fn(() => '7.57.0');
    jest.doMock('react-native-device-info', () => ({ getVersion }));
    const { readSocialAppBuild, withSocialAppBuild } = await load();
    expect(withSocialAppBuild({ screen_name: 'trending' })).toEqual({
      screen_name: 'trending',
      app_build: '7.57.0-test',
    });
    getVersion.mockReturnValue('9.0.0');
    expect(readSocialAppBuild()).toBe('7.57.0-test');
    expect(getVersion).toHaveBeenCalledTimes(1);
  });
});
