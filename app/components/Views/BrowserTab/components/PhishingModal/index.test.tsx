import React from 'react';
import PhishingModal from '.';
import { useNavigation } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: jest.fn(),
  })),
}));

describe('PhishingModal', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({ goBack: jest.fn() });
  });

  it('renders nothing when showPhishingModal is false', () => {
    expect(() =>
      render(
        <ThemeContext.Provider value={mockTheme}>
          <PhishingModal
            blockedUrl="http://phishing.com"
            showPhishingModal={false}
            setShowPhishingModal={jest.fn()}
            setBlockedUrl={jest.fn()}
            goToUrl={jest.fn()}
            urlBarRef={{ current: null }}
            addToWhitelist={jest.fn()}
            activeUrl={'www.test.com'}
          />
        </ThemeContext.Provider>,
      ),
    ).not.toThrow();
  });

  it('renders modal when showPhishingModal is true', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <PhishingModal
          blockedUrl="http://phishing.com"
          showPhishingModal
          setShowPhishingModal={jest.fn()}
          setBlockedUrl={jest.fn()}
          goToUrl={jest.fn()}
          urlBarRef={{ current: null }}
          addToWhitelist={jest.fn()}
          activeUrl={'www.test.com'}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).not.toBeNull();
  });
});
