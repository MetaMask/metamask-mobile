/**
 * @jest-environment node
 */

jest.mock('./PlaywrightMatchers.ts', () => ({
  __esModule: true,
  default: {
    countElementsByText: jest.fn().mockResolvedValue(2),
    getElementByNameiOS: jest.fn(),
    getElementByText: jest.fn(),
  },
}));

import Matchers from './Matchers';
import PlaywrightMatchers from './PlaywrightMatchers';

describe('Matchers Appium-only facades', () => {
  const mockElement = { selector: 'mock-element' };

  beforeEach(() => {
    jest.clearAllMocks();
    (PlaywrightMatchers.getElementByNameiOS as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (PlaywrightMatchers.getElementByText as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (PlaywrightMatchers.countElementsByText as jest.Mock).mockResolvedValue(2);
  });

  it('forwards countElementsByText to PlaywrightMatchers', async () => {
    const count = await Matchers.countElementsByText('Got it', true);

    expect(count).toBe(2);
    expect(PlaywrightMatchers.countElementsByText).toHaveBeenCalledWith(
      'Got it',
      true,
    );
  });

  it('forwards getElementByNameiOS to PlaywrightMatchers', async () => {
    const matched = await Matchers.getElementByNameiOS('TabBarItemTitle');

    expect(matched).toBe(mockElement);
    expect(PlaywrightMatchers.getElementByNameiOS).toHaveBeenCalledWith(
      'TabBarItemTitle',
      false,
    );
  });

  it('forwards getElementByExactText as an exact PlaywrightMatchers text lookup', async () => {
    const matched = await Matchers.getElementByExactText('Not now');

    expect(matched).toBe(mockElement);
    expect(PlaywrightMatchers.getElementByText).toHaveBeenCalledWith(
      'Not now',
      true,
    );
  });
});
