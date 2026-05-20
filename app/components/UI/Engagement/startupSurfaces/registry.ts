/**
 * Startup surface registry.
 *
 * Earlier entries take priority over later entries.
 * To reorder: edit STARTUP_SURFACE_ORDER.
 * To add a surface: add an id to StartupSurfaceId, add a row to
 * STARTUP_SURFACE_ORDER, write one resolver hook under resolvers/, and add
 * one branch to InlineStartupSurface (if inline) or one entry to
 * useStartupSurfacePresenter (if navigation-backed).
 */

export type StartupSurfaceId = 'push-pre-prompt' | 'perps-gtm' | 'predict-gtm';

export type StartupSurfaceStatus = 'resolving' | 'eligible' | 'ineligible';

export const STARTUP_SURFACE_ORDER: readonly StartupSurfaceId[] = [
  'push-pre-prompt',
  'perps-gtm',
  'predict-gtm',
] as const;
