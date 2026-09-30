/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { GachaController } from './GachaController';

/**
 * Returns the packs available from the current provider.
 */
export type GachaControllerGetPacksAction = {
  type: `GachaController:getPacks`;
  handler: GachaController['getPacks'];
};

/**
 * Prepares a purchase with the pack's provider.
 *
 * @param params - Account and pack to buy.
 */
export type GachaControllerGeneratePackAction = {
  type: `GachaController:generatePack`;
  handler: GachaController['generatePack'];
};

/**
 * Completes a purchase through its provider.
 *
 * @param params - Account and purchase memo.
 */
export type GachaControllerCompletePackAction = {
  type: `GachaController:completePack`;
  handler: GachaController['completePack'];
};

/**
 * Lets the provider dismiss a finished operation.
 *
 * @param params - Account and operation memo.
 */
export type GachaControllerDismissOperationAction = {
  type: `GachaController:dismissOperation`;
  handler: GachaController['dismissOperation'];
};

/**
 * Asks the provider to recover its interrupted operations.
 *
 * @param params - Account to recover.
 */
export type GachaControllerRecoverOperationsAction = {
  type: `GachaController:recoverOperations`;
  handler: GachaController['recoverOperations'];
};

/**
 * Synchronizes the account's cards through the provider.
 *
 * @param params - Account to synchronize.
 */
export type GachaControllerSyncCardsAction = {
  type: `GachaController:syncCards`;
  handler: GachaController['syncCards'];
};

/**
 * Refreshes a card's buyback offer through its provider.
 *
 * @param params - Account and card mint.
 */
export type GachaControllerRefreshBuybackAction = {
  type: `GachaController:refreshBuyback`;
  handler: GachaController['refreshBuyback'];
};

/**
 * Sells a card through its provider.
 *
 * @param params - Account and card mint.
 */
export type GachaControllerSellCardAction = {
  type: `GachaController:sellCard`;
  handler: GachaController['sellCard'];
};

/**
 * Union of all GachaController action types.
 */
export type GachaControllerMethodActions =
  | GachaControllerGetPacksAction
  | GachaControllerGeneratePackAction
  | GachaControllerCompletePackAction
  | GachaControllerDismissOperationAction
  | GachaControllerRecoverOperationsAction
  | GachaControllerSyncCardsAction
  | GachaControllerRefreshBuybackAction
  | GachaControllerSellCardAction;
