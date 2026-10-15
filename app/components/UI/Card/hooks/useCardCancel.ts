import { useMutation } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';

const useCardCancel = (cardId: string | undefined) =>
  useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Cannot cancel: no card ID');
      return Engine.context.CardController.cancelCard(cardId);
    },
  });

export default useCardCancel;
