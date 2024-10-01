// Third party dependencies.
import React from 'react';

// Internal dependencies.
import OnboardingSuccess from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useSelector } from 'react-redux';
import { selectProviderConfig, ProviderConfig } from '../../../selectors/networkController';

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
  chainId: '0x1',
  ticker: '',
  rpcUrl: '',
  nickname: undefined
};

describe('OnboardingSuccess', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector: typeof selectProviderConfig) => {
      if (selector === selectProviderConfig) return mockProviderConfig;
    });
    const mockOnDone = jest.fn();
    const { getByTestId, toJSON } = renderWithProvider(
      <OnboardingSuccess onDone={mockOnDone} backedUpSRP={false} noSRP={false} />,
    );

    // Snapshot test
    expect(toJSON()).toMatchSnapshot();

    const doneButton = getByTestId('onboarding-success-done-button');
    expect(doneButton).toBeTruthy();

    // Simulate button press
    doneButton.props.onPress();

    // Check if mockOnDone was called
    expect(mockOnDone).toHaveBeenCalledTimes(1);
  });
});
