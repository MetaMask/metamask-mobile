import React from 'react';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { TokenStoryView as TokenStoryViewComponent } from '../../UI/Tokens/TokenStoryView';

type TokenStoryViewParams = {
  TokenStoryView: {
    initialIndex?: number;
  };
};

/**
 * TokenStoryView screen - A full-screen vertical swipe navigation for browsing token holdings.
 *
 * Navigate to this screen to allow users to browse through their tokens
 * using Instagram Stories-like vertical swipe navigation.
 *
 * @example
 * ```tsx
 * navigation.navigate(Routes.WALLET.TOKEN_STORY_VIEW, { initialIndex: 0 });
 * ```
 */
const TokenStoryView = () => {
  const route = useRoute<RouteProp<TokenStoryViewParams, 'TokenStoryView'>>();
  const navigation = useNavigation();

  const initialIndex = route.params?.initialIndex ?? 0;

  return (
    <TokenStoryViewComponent
      initialIndex={initialIndex}
      onClose={() => navigation.goBack()}
    />
  );
};

export default TokenStoryView;
