import { usePerpsGtmResolver } from './resolvers/usePerpsGtmResolver';
import { usePredictGtmResolver } from './resolvers/usePredictGtmResolver';

/**
 * Mounts resolver hooks for navigation-backed startup surfaces.
 * Renders nothing — resolvers only dispatch Redux actions.
 *
 * Push pre-prompt eligibility is resolved inside InlineStartupSurface to keep
 * a single usePushPrePromptVariant instance and avoid the two-instance race
 * where markPrePromptShown() can make a separate resolver instance dispatch
 * ineligible before surfaceCompleted fires.
 *
 * To add a new surface: write a resolver hook under resolvers/ and call it here
 * (for navigation-backed surfaces), or add a branch to InlineStartupSurface
 * (for inline surfaces).
 */
const StartupSurfaceResolvers = () => {
  usePerpsGtmResolver();
  usePredictGtmResolver();

  return null;
};

export default StartupSurfaceResolvers;
