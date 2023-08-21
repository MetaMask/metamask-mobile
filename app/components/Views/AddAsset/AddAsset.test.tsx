import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import AddAsset from './AddAsset';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});

const mockUseParamsValues: {
  assetType: string;
  collectibleContract?: {
    address: string;
  };
} = {
  assetType: 'collectible',
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const ScrollableTabViewMock = jest
    .fn()
    .mockImplementation(() => ScrollableTabViewMock);

  return ScrollableTabViewMock;
});

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('AddAsset component', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
  it('renders display nft warning when displayNftMedia is true', () => {
    const { getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });

    expect(getByTestId('enable-display-media-text')).toBeDefined();
  });
});
