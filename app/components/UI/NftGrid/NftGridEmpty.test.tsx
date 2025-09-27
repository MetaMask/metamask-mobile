import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NftGridEmpty from './NftGridEmpty';
import AppConstants from '../../../core/AppConstants';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('NftGridEmpty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = render(<NftGridEmpty />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays empty state content', () => {
    const { getByText, getByTestId } = render(<NftGridEmpty />);

    const container = getByTestId('nft-empty-container');
    expect(container).toBeDefined();
    expect(getByText('No NFTs yet')).toBeDefined();
    expect(getByText('Learn more')).toBeDefined();
  });

  it('navigates to learn more when pressed', () => {
    const { getByText } = render(<NftGridEmpty />);

    const learnMoreButton = getByText('Learn more');
    fireEvent.press(learnMoreButton);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: AppConstants.URLS.NFT },
    });
  });
});
