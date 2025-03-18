import React from 'react';
import { AssetLoader } from '.';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { screen } from '@testing-library/react-native';

const mockDispatch = jest.fn();
jest.mock('@react-navigation/native', () => {
    const actual = jest.requireActual('@react-navigation/native');
    return {
        ...actual,
        useNavigation: jest.fn().mockImplementation(() => ({
            dispatch: mockDispatch,
        })),
    };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryDataController: {
      fetchTokenDisplayData: jest.fn(),
    },
  },
}));

const mockSelectTokenDisplayData = jest.fn();
jest.mock('../../../selectors/tokenSearchDiscoveryDataController', () => ({
    selectTokenDisplayData: () => mockSelectTokenDisplayData(),
}));

const mockState = {
    engine: {
        backgroundState: {
            TokenSearchDiscoveryDataController: {
                tokenDisplayData: [],
            },
        },
    },
};

const assetData = {
    address: '0x123',
    chainId: '0x1' as Hex,
};

describe('AssetLoader', () => {
  it('should show activity indicator while loading token', () => {
    mockSelectTokenDisplayData.mockReturnValue(undefined);
    renderWithProvider(<AssetLoader route={{ params: assetData }} />, { state: mockState });
    expect(screen.getByTestId('asset-loader-spinner')).toBeDefined();
  });

  it('should show a message saying the token was not found if the token is not found', () => {
    mockSelectTokenDisplayData.mockReturnValue({
        found: false,
    });
    renderWithProvider(<AssetLoader route={{ params: assetData }} />, { state: mockState });
    expect(screen.getByText('Token not found')).toBeDefined();
  });

  it('should navigate to the asset view if the token is found', () => {
    mockSelectTokenDisplayData.mockReturnValue({
        found: true,
        token: {}
    });
    renderWithProvider(<AssetLoader route={{ params: assetData }} />, { state: mockState });
    expect(mockDispatch).toHaveBeenCalled();
  });
});
