import React from 'react';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { PredictStoryView as PredictStoryViewComponent } from '../../UI/Predict/views/PredictStoryView';
import { PredictCategory } from '../../UI/Predict/types';

type PredictStoryViewParams = {
  PredictStoryView: {
    initialIndex?: number;
    category?: PredictCategory;
  };
};

/**
 * PredictStoryView screen - A full-screen vertical swipe navigation for browsing prediction markets.
 *
 * Navigate to this screen to allow users to browse through prediction markets
 * using Instagram Stories-like vertical swipe navigation.
 *
 * @example
 * ```tsx
 * navigation.navigate(Routes.PREDICT.STORY_VIEW, {
 *   initialIndex: 0,
 *   category: 'trending',
 * });
 * ```
 */
const PredictStoryView = () => {
  const route = useRoute<RouteProp<PredictStoryViewParams, 'PredictStoryView'>>();
  const navigation = useNavigation();

  const initialIndex = route.params?.initialIndex ?? 0;
  const category = route.params?.category ?? 'trending';

  return (
    <PredictStoryViewComponent
      initialIndex={initialIndex}
      category={category}
      onClose={() => navigation.goBack()}
    />
  );
};

export default PredictStoryView;
