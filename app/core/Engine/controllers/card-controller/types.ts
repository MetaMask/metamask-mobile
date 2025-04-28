import { CardController, CardControllerState } from '@metamask/card-controller';

/**
 * Card Controller Actions
 */
export type CardControllerActions = 
  | {
      type: 'CardController:isCardHolder';
      handler: CardController['isCardHolder'];
    };

/**
 * Card Controller Events
 */
export type CardControllerEvents = never;

/**
 * Export the state type
 */
export type { CardControllerState }; 