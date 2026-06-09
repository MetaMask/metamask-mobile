import { useMutation } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';

const useCardFreeze = (cardId: string | undefined) => {
  const freeze = useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Cannot freeze: no card ID');
      return Engine.context.CardController.freezeCard(cardId);
    },
  });

  const unfreeze = useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Cannot unfreeze: no card ID');
      return Engine.context.CardController.unfreezeCard(cardId);
    },
  });

  return { freeze, unfreeze };
};

export default useCardFreeze;
