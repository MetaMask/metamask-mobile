// Mock the necessary dependencies
jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn((origin) => {
        if (origin === 'http://phishing.com') return { result: true };
        return { result: false };
      }),
    },
  },
}));

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(() => ({}))
  }
}));

jest.mock('../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(() => true)
}));

// Import the function after mocking
import isLinkSafe from './linkCheck';

describe('linkCheck with basicFunctionalityEnabled=true', () => {
  it('should correctly identify safe links', () => {
    expect(isLinkSafe('https://ww.example.com/')).toBe(true);
    expect(isLinkSafe('https://www.example.com/')).toBe(true);
  });

  it('should correctly identify unsafe links', () => {
    expect(isLinkSafe('http://phishing.com')).toBe(false);
    expect(isLinkSafe('example.com')).toBe(false); // Invalid URL format
    expect(isLinkSafe('htps://ww.example.com/')).toBe(false); // Invalid protocol
  });
}); 