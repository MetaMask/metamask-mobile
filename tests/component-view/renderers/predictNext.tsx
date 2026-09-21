import '../mocks';
import React from 'react';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventScreen } from '../../../app/components/UI/PredictNext/views/PredictEvent/PredictEventScreen';
import { PredictFeedScreen } from '../../../app/components/UI/PredictNext/views/PredictFeedScreen/PredictFeedScreen';
import { PredictPortfolioScreen } from '../../../app/components/UI/PredictNext/views/PredictPortfolio/PredictPortfolioScreen';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';
import { PredictOrderFlowProvider } from '../../../app/components/UI/PredictNext/views/PredictOrderFlow';
import type {
  PredictNextEventParams,
  PredictNextFeedParams,
  PredictNextHomeParams,
  PredictNextPortfolioParams,
} from '../../../app/components/UI/PredictNext/navigation/types';

/** Mirrors production wiring: the Order Flow provider wraps the stack. */
const withOrderFlow =
  (Component: React.ComponentType): React.ComponentType =>
  (props) => (
    <PredictOrderFlowProvider>
      <Component {...props} />
    </PredictOrderFlowProvider>
  );

const EventScreen = withOrderFlow(
  PredictEventScreen as unknown as React.ComponentType,
);
const FeedScreen = withOrderFlow(
  PredictFeedScreen as unknown as React.ComponentType<object>,
);
const HomeScreen = withOrderFlow(PredictHome as unknown as React.ComponentType);
const PortfolioScreen = withOrderFlow(
  PredictPortfolioScreen as unknown as React.ComponentType<object>,
);

export const renderPredictOrderFlow = (Component: React.ComponentType) =>
  renderComponentViewScreen(
    withOrderFlow(Component),
    { name: PredictNextRoutes.HOME },
    { state: initialStatePredictNext().build() },
  );

export const renderPredictNext = (
  initialParams?: PredictNextHomeParams,
  privacyMode = false,
) =>
  renderScreenWithRoutes(
    HomeScreen,
    { name: PredictNextRoutes.HOME },
    [
      { name: PredictNextRoutes.FEED, Component: FeedScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
      { name: PredictNextRoutes.PORTFOLIO, Component: PortfolioScreen },
    ],
    { state: initialStatePredictNext(privacyMode).build() },
    initialParams ? { ...initialParams } : undefined,
  );

export const renderPredictEventScreen = (
  initialParams: PredictNextEventParams,
) =>
  renderScreenWithRoutes(
    EventScreen,
    { name: PredictNextRoutes.EVENT },
    [{ name: PredictNextRoutes.HOME, Component: HomeScreen }],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );

export const renderPredictPortfolioScreen = (
  initialParams: PredictNextPortfolioParams,
  privacyMode = false,
) =>
  renderScreenWithRoutes(
    PortfolioScreen,
    { name: PredictNextRoutes.PORTFOLIO },
    [
      { name: PredictNextRoutes.HOME, Component: HomeScreen },
      { name: PredictNextRoutes.EVENT, Component: EventScreen },
    ],
    { state: initialStatePredictNext(privacyMode).build() },
    { ...initialParams },
  );

export const renderPredictFeedScreen = (initialParams: PredictNextFeedParams) =>
  renderScreenWithRoutes(
    FeedScreen,
    { name: PredictNextRoutes.FEED },
    [{ name: PredictNextRoutes.HOME, Component: HomeScreen }],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );
