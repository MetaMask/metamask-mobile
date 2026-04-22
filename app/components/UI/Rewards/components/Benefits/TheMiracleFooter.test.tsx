import React from 'react';
import { render } from '@testing-library/react-native';
import TheMiracleFooter from './TheMiracleFooter';

const mockStrings = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'rewards.benefits.powered_by': 'Powered by',
  };
  return translations[key] || key;
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => mockStrings(key),
}));

jest.mock('images/benefits/themiracle-logo.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({
    width,
    height,
    name,
  }: {
    width: number;
    height: number;
    name: string;
  }) =>
    ReactActual.createElement(View, {
      testID: 'the-miracle-logo',
      width,
      height,
      name,
    });
});

describe('TheMiracleFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders powered by text', () => {
    const { getByText } = render(<TheMiracleFooter />);

    expect(getByText('Powered by')).toBeOnTheScreen();
  });

  it('uses rewards benefits i18n key for powered by copy', () => {
    render(<TheMiracleFooter />);

    expect(mockStrings).toHaveBeenCalledWith('rewards.benefits.powered_by');
  });

  it('renders logo with expected props', () => {
    const { getByTestId } = render(<TheMiracleFooter />);
    const logo = getByTestId('the-miracle-logo');

    expect(logo).toBeOnTheScreen();
    expect(logo.props.name).toBe('TheMiracleLogo');
    expect(logo.props.width).toBe(90);
    expect(logo.props.height).toBe(26);
  });
});
