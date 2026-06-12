import React from 'react';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { strings } from '../../../../../locales/i18n';
import OnboardingGeneralSettings from '.';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      getParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNetworkName = 'Ethereum Main Network';

describe('OnboardingGeneralSettings', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { getByText } = renderWithProvider(<OnboardingGeneralSettings />);
    expect(
      getByText(strings('default_settings.basic_functionality')),
    ).toBeOnTheScreen();
  });
});
