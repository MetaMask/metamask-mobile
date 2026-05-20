import React from 'react';
import InlineStartupSurface from './InlineStartupSurface';
import StartupSurfaceResolvers from './StartupSurfaceResolvers';
import { useStartupSurfacePresenter } from './useStartupSurfacePresenter';

/**
 * Single entry point for all startup surface logic. Mount once in
 * MainNavigator, AFTER the Stack.Navigator so that InlineStartupSurface's
 * bottom sheet renders above navigation screens (React Native z-order: later
 * siblings are on top).
 *
 * Responsibilities:
 * - StartupSurfaceResolvers: dispatch eligibility status for each surface
 * - useStartupSurfacePresenter: navigate to navigation-backed surfaces
 * - InlineStartupSurface: render the push pre-prompt bottom sheet
 */
const StartupSurfaceCoordination = () => {
  useStartupSurfacePresenter();

  return (
    <>
      <StartupSurfaceResolvers />
      <InlineStartupSurface />
    </>
  );
};

export default StartupSurfaceCoordination;
