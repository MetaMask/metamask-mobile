// Third party dependencies.
import React from 'react';

// Internal dependencies.
import ManageNetworks from './ManageNetworks';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../selectors/networkInfos';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNetworkName: string = 'Ethereum Main Network';

describe('ManageNetworks', () => {
  it('should render correctly', () => {
    (useSelector as jest.Mock).mockImplementation((selector: (state: any) => any) => {
      if (selector === selectNetworkName) return mockNetworkName;
    });
    const { toJSON } = renderWithProvider(
      <ManageNetworks navigation={useNavigation()} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
