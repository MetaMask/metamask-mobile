/**
 * This file is auto generated.
 * Do not edit manually.
 */

import type { CollectiblesController } from './CollectiblesController';

/**
 * Records onboarding completion once for the wallet, across all accounts.
 */
export type CollectiblesControllerCompleteOnboardingAction = {
  type: `CollectiblesController:completeOnboarding`;
  handler: CollectiblesController['completeOnboarding'];
};

/**
 * Allows onboarding to be replayed without changing provider data.
 */
export type CollectiblesControllerResetOnboardingAction = {
  type: `CollectiblesController:resetOnboarding`;
  handler: CollectiblesController['resetOnboarding'];
};

/**
 * Prepares a purchase with the pack's provider.
 *
 * @param params - Account and pack to buy.
 */
export type CollectiblesControllerGeneratePackAction = {
  type: `CollectiblesController:generatePack`;
  handler: CollectiblesController['generatePack'];
};

/**
 * Completes a purchase through its provider.
 *
 * @param params - Account and purchase memo.
 */
export type CollectiblesControllerCompletePackAction = {
  type: `CollectiblesController:completePack`;
  handler: CollectiblesController['completePack'];
};

/**
 * Completes each transaction of the already reviewed purchase.
 *
 * @param params - Account and batch entry memo.
 */
export type CollectiblesControllerCompletePacksAction = {
  type: `CollectiblesController:completePacks`;
  handler: CollectiblesController['completePacks'];
};

/**
 * Saves the reveal position independently of payment and opening.
 */
export type CollectiblesControllerMarkPackRevealedAction = {
  type: `CollectiblesController:markPackRevealed`;
  handler: CollectiblesController['markPackRevealed'];
};

/**
 * Sells the selected cards at their individually confirmed minimum amounts.
 *
 * @param params - Account and reviewed mint/amount pairs.
 */
export type CollectiblesControllerSellCardsAction = {
  type: `CollectiblesController:sellCards`;
  handler: CollectiblesController['sellCards'];
};

/**
 * Lets the provider dismiss a finished operation.
 *
 * @param params - Account and operation memo.
 */
export type CollectiblesControllerDismissOperationAction = {
  type: `CollectiblesController:dismissOperation`;
  handler: CollectiblesController['dismissOperation'];
};

/**
 * Resumes the account's interrupted purchases and buybacks by memo. Never
 * signs, never submits and never throws.
 *
 * @param params - Solana address to recover.
 */
export type CollectiblesControllerRecoverOperationsAction = {
  type: `CollectiblesController:recoverOperations`;
  handler: CollectiblesController['recoverOperations'];
};

/**
 * Checks the account's pending buybacks by memo, without waiting on
 * purchases. Never signs, never submits and never throws.
 *
 * @param params - Solana address whose sales are checked.
 */
export type CollectiblesControllerCheckSalesAction = {
  type: `CollectiblesController:checkSales`;
  handler: CollectiblesController['checkSales'];
};

/**
 * Sells a card through its provider at no less than the confirmed amount.
 *
 * @param params - Account, card mint, its standard and the refund shown to the user.
 */
export type CollectiblesControllerSellCardAction = {
  type: `CollectiblesController:sellCard`;
  handler: CollectiblesController['sellCard'];
};

/**
 * Union of all CollectiblesController action types.
 */
export type CollectiblesControllerMethodActions =
  | CollectiblesControllerCompleteOnboardingAction
  | CollectiblesControllerResetOnboardingAction
  | CollectiblesControllerGeneratePackAction
  | CollectiblesControllerCompletePackAction
  | CollectiblesControllerCompletePacksAction
  | CollectiblesControllerMarkPackRevealedAction
  | CollectiblesControllerSellCardsAction
  | CollectiblesControllerDismissOperationAction
  | CollectiblesControllerRecoverOperationsAction
  | CollectiblesControllerCheckSalesAction
  | CollectiblesControllerSellCardAction;
