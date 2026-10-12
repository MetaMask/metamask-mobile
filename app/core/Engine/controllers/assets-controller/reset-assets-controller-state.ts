import {
  getDefaultAssetsControllerState,
  type AssetsController,
  type AssetsControllerState,
} from '@metamask/assets-controller';

interface UpdatableAssetsController {
  update: (callback: () => AssetsControllerState) => void;
}

/**
 * Resets `AssetsController` state to its defaults, keeping the user's
 * selected currency. The controller has no public reset API, so this goes
 * through the protected `update` method of the base controller.
 *
 * @param controller - The AssetsController instance to reset.
 */
export function resetAssetsControllerState(controller: AssetsController): void {
  const { selectedCurrency } = controller.state;
  (controller as unknown as UpdatableAssetsController).update(() => ({
    ...getDefaultAssetsControllerState(),
    selectedCurrency,
  }));
}
