// Third party dependencies.
import React from 'react';

// Internal dependencies.
import DefaultSettings from '.';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// @ts-expect-error - useNavigation is imported but not used, suppressing the error
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../../selectors/networkInfos';

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

const mockNetworkName = 'Ethereum Main Network';

// @ts-expect-error - Using any for RootState in test file
type RootState = any; // TODO: Replace 'any' with the actual RootState type
type Selector = (state: RootState) => string;

describe('DefaultSettings', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector: Selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { toJSON } = renderWithProvider(
      <DefaultSettings />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
