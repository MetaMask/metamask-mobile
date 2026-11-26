import { useMutation } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { CARD_HOME_PROTOTYPE_VIEW } from '../../../../selectors/cardController'; // PROTOTYPE-DO-NOT-MERGE
// PROTOTYPE-DO-NOT-MERGE: under the sim mock, freeze/unfreeze just wait briefly and succeed (no API call).
const mockSucceed = () => new Promise<void>((r) => setTimeout(r, 600)); // PROTOTYPE-DO-NOT-MERGE

const useCardFreeze = (cardId: string | undefined) => {
  const freeze = useMutation({
    mutationFn: () => {
      if (CARD_HOME_PROTOTYPE_VIEW) return mockSucceed(); // PROTOTYPE-DO-NOT-MERGE
      if (!cardId) throw new Error('Cannot freeze: no card ID');
      return Engine.context.CardController.freezeCard(cardId);
    },
  });

  const unfreeze = useMutation({
    mutationFn: () => {
      if (CARD_HOME_PROTOTYPE_VIEW) return mockSucceed(); // PROTOTYPE-DO-NOT-MERGE
      if (!cardId) throw new Error('Cannot unfreeze: no card ID');
      return Engine.context.CardController.unfreezeCard(cardId);
    },
  });

  return { freeze, unfreeze };
};

export default useCardFreeze;
