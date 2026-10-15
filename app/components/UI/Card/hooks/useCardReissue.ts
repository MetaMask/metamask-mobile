import { useMutation } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';

const useCardReissue = (cardId: string | undefined) =>
  useMutation({
    mutationFn: () => {
      if (!cardId) throw new Error('Cannot reissue: no card ID');
      return Engine.context.CardController.reissueCard(cardId);
    },
  });

export default useCardReissue;
