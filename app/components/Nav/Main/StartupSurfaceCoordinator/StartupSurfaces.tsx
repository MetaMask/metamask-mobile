import React, { useMemo } from 'react';
import { useNotificationsPrePromptStartupSurface } from '../../../Views/Notifications/PushNotificationOnboarding/useNotificationsPrePromptStartupSurface';
import { usePerpsGtmStartupSurface } from '../../../UI/Perps/components/PerpsGTMModal/usePerpsGtmStartupSurface';
import { usePredictGtmStartupSurface } from '../../../UI/Predict/components/PredictGTMModal/usePredictGtmStartupSurface';
import { StartupSurfaceOrchestrator, type StartupSurfaceDescriptor } from '.';

const StartupSurfaces = () => {
  const notificationsPrePromptSurface =
    useNotificationsPrePromptStartupSurface();
  const perpsGtmSurface = usePerpsGtmStartupSurface();
  const predictGtmSurface = usePredictGtmStartupSurface();

  const surfaces = useMemo<StartupSurfaceDescriptor[]>(
    // This order is the priority: earlier surfaces block later ones while resolving.
    () => [notificationsPrePromptSurface, perpsGtmSurface, predictGtmSurface],
    [notificationsPrePromptSurface, perpsGtmSurface, predictGtmSurface],
  );

  return <StartupSurfaceOrchestrator surfaces={surfaces} />;
};

export default StartupSurfaces;
