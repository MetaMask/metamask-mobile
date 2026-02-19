import React from 'react';
import RestrictedSiteModal from '.';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

describe('RestrictedSiteModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when showModal is false', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <RestrictedSiteModal
          restrictedUrl="https://restricted-site.com"
          showModal={false}
          onClose={mockOnClose}
        />
      </ThemeContext.Provider>,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders modal content when showModal is true', () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <RestrictedSiteModal
          restrictedUrl="https://restricted-site.com"
          showModal
          onClose={mockOnClose}
        />
      </ThemeContext.Provider>,
    );

    expect(getByText('Site Cannot Be Reached')).toBeOnTheScreen();
    expect(
      getByText(
        "This site may be restricted by your device's security settings.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('https://restricted-site.com')).toBeOnTheScreen();
    expect(getByText('Go Back')).toBeOnTheScreen();
  });

  it('calls onClose when Go Back button is pressed', () => {
    const { getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <RestrictedSiteModal
          restrictedUrl="https://restricted-site.com"
          showModal
          onClose={mockOnClose}
        />
      </ThemeContext.Provider>,
    );

    const goBackButton = getByText('Go Back');
    fireEvent.press(goBackButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders without URL when restrictedUrl is undefined', () => {
    const { queryByText, getByText } = render(
      <ThemeContext.Provider value={mockTheme}>
        <RestrictedSiteModal
          restrictedUrl={undefined}
          showModal
          onClose={mockOnClose}
        />
      </ThemeContext.Provider>,
    );

    expect(getByText('Site Cannot Be Reached')).toBeOnTheScreen();
    expect(queryByText('https://')).toBeNull();
  });

  it('matches snapshot when showModal is true', () => {
    const { toJSON } = render(
      <ThemeContext.Provider value={mockTheme}>
        <RestrictedSiteModal
          restrictedUrl="https://restricted-site.com"
          showModal
          onClose={mockOnClose}
        />
      </ThemeContext.Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
