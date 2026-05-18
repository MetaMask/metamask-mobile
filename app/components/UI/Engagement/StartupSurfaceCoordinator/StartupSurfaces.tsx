import React, { useMemo } from 'react';
import { useNotificationsPrePromptStartupSurface } from '../../../Views/Notifications/PushNotificationOnboarding/useNotificationsPrePromptStartupSurface';
import { usePerpsGtmStartupSurface } from '../../Perps/components/PerpsGTMModal/usePerpsGtmStartupSurface';
import { usePredictGtmStartupSurface } from '../../Predict/components/PredictGTMModal/usePredictGtmStartupSurface';
import { StartupSurfaceOrchestrator, type StartupSurfaceDescriptor } from '.';

/**
 * Registers all surfaces that may appear on app startup.
 *
 * This component is the priority list: earlier surfaces resolve before later
 * ones can present, even when a later surface is already eligible.
 *
 * Keep this list in sync with StartupSurfaceId in state.ts. Adding a startup
 * surface requires a new id, a descriptor hook, and a position in this list.
 */
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
