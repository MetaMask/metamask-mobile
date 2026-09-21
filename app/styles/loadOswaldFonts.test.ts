import { loadAsync } from 'expo-font';
import { loadOswaldFonts } from './loadOswaldFonts';

jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../fonts/Oswald-Medium.ttf', () => 1, { virtual: true });
jest.mock('../fonts/Oswald-SemiBold.ttf', () => 1, { virtual: true });

describe('loadOswaldFonts', () => {
  it('registers Oswald Medium and SemiBold with expo-font', async () => {
    await loadOswaldFonts();

    expect(loadAsync).toHaveBeenCalledWith({
      'Oswald-Medium': expect.anything(),
      'Oswald-SemiBold': expect.anything(),
    });
  });
});
