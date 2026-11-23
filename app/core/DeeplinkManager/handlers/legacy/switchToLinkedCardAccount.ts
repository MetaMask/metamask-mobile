import Logger from '../../../../util/Logger';
import Engine from '../../../Engine';

export const switchToLinkedCardAccount = async (): Promise<void> => {
  try {
    const address =
      await Engine.context.CardController.findLinkedAccountAddress();
    if (address) {
      Engine.setSelectedAddress(address);
    }
  } catch (error) {
    Logger.error(
      error as Error,
      '[switchToLinkedCardAccount] Failed to switch to linked card account',
    );
  }
};
