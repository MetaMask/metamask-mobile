// Third party dependencies.
import React from 'react';

// Internal dependencies.
import DefaultSettings from '.';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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

describe('DefaultSettings', () => {
  it('should render correctly', () => {
    useSelector.mockImplementation((selector) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { toJSON } = renderWithProvider(
      <DefaultSettings navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
