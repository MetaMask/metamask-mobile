import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddAsset from './AddAsset';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAssetView.selectors';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

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
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
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

    expect(
      getByTestId(AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA),
    ).toBeDefined();
  });
});
