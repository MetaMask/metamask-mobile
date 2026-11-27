import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import HiddenTokensView from './HiddenTokensView';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AssetsController: { unhideAsset: jest.fn(), addCustomAsset: jest.fn() },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockSelectAccountByScope = jest.fn();
jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: () => mockSelectAccountByScope,
}));

const mockUseHiddenAssetIds = jest.fn();
jest.mock('../../hooks/useHiddenAssetIds', () => ({
  useHiddenAssetIds: () => mockUseHiddenAssetIds(),
}));

const ACCOUNT_ID = 'account-1';
const ASSET_ID = 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678';

const renderView = (
  assetsInfo: Record<string, unknown> = {},
  assetsBalance: Record<string, unknown> = {},
) =>
  renderWithProvider(<HiddenTokensView />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          AssetsController: {
            ...backgroundState.AssetsController,
            assetsInfo: assetsInfo as never,
            assetsBalance: assetsBalance as never,
          },
        },
      },
    },
  });

describe('HiddenTokensView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHiddenAssetIds.mockReturnValue([ASSET_ID]);
    mockSelectAccountByScope.mockReturnValue({ id: ACCOUNT_ID });
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

  it('only unhides a token that has a balance', () => {
    const { getByTestId } = renderView(
      {},
      { [ACCOUNT_ID]: { [ASSET_ID]: { amount: '1.5' } } },
    );

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

    expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
      ASSET_ID,
    );
    expect(
      Engine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it('only unhides when no account is found for the chain', () => {
    mockSelectAccountByScope.mockReturnValue(undefined);
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

    expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
      ASSET_ID,
    );
    expect(
      Engine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['has no balance entry', {}],
    [
      'has a zero balance entry',
      { [ACCOUNT_ID]: { [ASSET_ID]: { amount: '0' } } },
    ],
  ])(
    're-adds the token as a custom asset when it %s',
    (_label, assetsBalance) => {
      const { getByTestId } = renderView(
        { [ASSET_ID]: { name: 'Test Token', symbol: 'TEST', decimals: 18 } },
        assetsBalance,
      );

      fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(ACCOUNT_ID, ASSET_ID);
      expect(
        Engine.context.AssetsController.unhideAsset,
      ).not.toHaveBeenCalled();
    },
  );

  it('logs a failure when the scoped account lookup throws', () => {
    const error = new Error('scope failed');
    mockSelectAccountByScope.mockImplementation(() => {
      throw error;
    });
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'HiddenTokensView: unhideAsset failed',
    );
    expect(
      Engine.context.AssetsController.addCustomAsset,
    ).not.toHaveBeenCalled();
    expect(Engine.context.AssetsController.unhideAsset).not.toHaveBeenCalled();
  });

  it('logs a failure when re-adding a zero-balance token rejects', async () => {
    const error = new Error('add failed');
    (
      Engine.context.AssetsController.addCustomAsset as jest.Mock
    ).mockRejectedValueOnce(error);
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.UNHIDE_BUTTON));

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'HiddenTokensView: unhideAsset failed',
      );
    });
    expect(Engine.context.AssetsController.unhideAsset).not.toHaveBeenCalled();
  });
});
