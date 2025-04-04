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

  it('should match snapshot when showPhishingModal is false', () => {
    const { toJSON } = render(
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
          blockListType={{ current: 'test' }}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match snapshot when showPhishingModal is true', () => {
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
          blockListType={{ current: 'test' }}
        />
      </ThemeContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
