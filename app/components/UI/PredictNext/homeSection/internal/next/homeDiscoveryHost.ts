import { createContext } from 'react';

/**
 * What discovery is showing. `hidden` covers every state with nothing to
 * show: no supported slot, no valid catalog, a failed read with nothing
 * cached, and empty Feeds. The section renders nothing for it, as the
 * Polymarket section does for an empty or failed discovery.
 */
export type HomeDiscoveryState =
  | { status: 'loading' }
  | { status: 'ready'; itemCount: number }
  | { status: 'hidden'; reason: 'unsupported' | 'empty' | 'error' };

/**
 * The Homepage section that hosts discovery. Discovery may render through a
 * UI Slots widget, so the section reaches it through context rather than
 * props.
 */
export interface HomeDiscoveryHost {
  /** Whether the section is on screen: live data is watched only then. */
  isVisible: boolean;
  onStateChange: (state: HomeDiscoveryState) => void;
}

export const HomeDiscoveryHostContext = createContext<HomeDiscoveryHost | null>(
  null,
);
