import React from 'react';
import InlineStartupSurface from './InlineStartupSurface';
import StartupSurfaceResolvers from './StartupSurfaceResolvers';
import { useStartupSurfacePresenter } from './useStartupSurfacePresenter';

/**
 * Coordinates startup-surface resolution and presentation.
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
