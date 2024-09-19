// Third party dependencies.
import React from 'react';

// Internal dependencies.
import OnboardingSuccess from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../selectors/networkController';
import { RootState } from '../../../reducers';

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

interface ProviderConfig {
  type: string;
  chainId: string;
  ticker: string;
  rpcUrl: string;
  nickname?: string;
  network?: string;
}

const mockProviderConfig: ProviderConfig = {
  type: 'mainnet',
  chainId: '0x1',
  ticker: 'ETH',
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
};

describe('OnboardingSuccess', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector: (state: RootState) => unknown) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });

    const { toJSON } = renderWithProvider(
      <OnboardingSuccess
        onDone={jest.fn()}
        backedUpSRP={false}
        noSRP={false}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
