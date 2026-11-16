import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Engine from '../../../../../core/Engine';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import HiddenTokensView from './HiddenTokensView';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: { AssetsController: { unhideAsset: jest.fn() } },
}));

const mockUseHiddenAssetIds = jest.fn();
jest.mock('../../hooks/useHiddenAssetIds', () => ({
  useHiddenAssetIds: () => mockUseHiddenAssetIds(),
}));

const ASSET_ID = 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678';

const renderView = (assetsInfo: Record<string, unknown> = {}) =>
  renderWithProvider(<HiddenTokensView />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          AssetsController: {
            ...backgroundState.AssetsController,
            assetsInfo: assetsInfo as never,
          },
        },
      },
    },
  });

describe('HiddenTokensView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHiddenAssetIds.mockReturnValue([ASSET_ID]);
  });

  it('shows the empty state when nothing is hidden', () => {
    mockUseHiddenAssetIds.mockReturnValue([]);
    const { getByTestId, getByText } = renderView();

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.HIDDEN_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(getByText("You don't have any hidden tokens.")).toBeOnTheScreen();
  });

  it('shows a hidden token with its stored metadata', () => {
    const { getByText } = renderView({
      [ASSET_ID]: { name: 'Test Token', symbol: 'TEST', decimals: 18 },
    });

    expect(getByText('Test Token')).toBeOnTheScreen();
    expect(getByText('TEST')).toBeOnTheScreen();
  });

  it('falls back to a short id when metadata is missing', () => {
    const { getAllByText } = renderView();

    expect(getAllByText('0x1234...5678').length).toBeGreaterThan(0);
  });

  it('unhides the token on press', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

    expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
      ASSET_ID,
    );
  });
});
