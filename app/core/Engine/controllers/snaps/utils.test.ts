import { getClientConfig } from './utils';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.2.3'),
}));

describe('getClientConfig', () => {
  it('returns the mobile type', () => {
    const config = getClientConfig();
    expect(config.type).toBe('mobile');
  });

  it('returns the version from react-native-device-info', () => {
    const config = getClientConfig();
    expect(config.version).toBe('1.2.3');
  });
});
