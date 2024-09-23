// Third party dependencies.
import React from 'react';

// Internal dependencies.
import OnboardingSuccess from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';

// Define ProviderConfig type
interface ProviderConfig {
  type: string;
  chainId: string;
}

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockProviderConfig: ProviderConfig = {
  type: 'mainnet',
  chainId: '1',
};

describe('OnboardingSuccess', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector: typeof selectProviderConfig) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const { toJSON } = renderWithProvider(
      <OnboardingSuccess onDone={jest.fn()} backedUpSRP={false} noSRP={false} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
