import {
  getDefaultAssetsControllerState,
  type AssetsController,
  type AssetsControllerState,
} from '@metamask/assets-controller';
import { resetAssetsControllerState } from './reset-assets-controller-state';

const createController = (state: AssetsControllerState) => {
  const controller = {
    state,
    update: jest.fn((callback: () => AssetsControllerState) => {
      controller.state = callback();
    }),
  };
  return controller;
};

describe('resetAssetsControllerState', () => {
  it('clears user and account data and restores default asset info', () => {
    const controller = createController({
      ...getDefaultAssetsControllerState(),
      assetsInfo: {},
      assetsBalance: { 'account-1': {} },
      assetsPrice: {},
      customAssets: { 'account-1': [] },
      assetPreferences: { 'eip155:1/slip44:60': { hidden: true } },
    } as unknown as AssetsControllerState);

    resetAssetsControllerState(controller as unknown as AssetsController);

    const defaults = getDefaultAssetsControllerState();
    expect(controller.state.assetPreferences).toEqual({});
    expect(controller.state.customAssets).toEqual({});
    expect(controller.state.assetsBalance).toEqual({});
    expect(controller.state.assetsPrice).toEqual({});
    expect(controller.state.assetsInfo).toEqual(defaults.assetsInfo);
  });

  it('preserves the selected currency', () => {
    const controller = createController({
      ...getDefaultAssetsControllerState(),
      selectedCurrency: 'eur',
    });

    resetAssetsControllerState(controller as unknown as AssetsController);

    expect(controller.state.selectedCurrency).toBe('eur');
  });
});
