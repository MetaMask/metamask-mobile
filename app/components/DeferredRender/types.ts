import type { ReactNode } from 'react';

/**
 * Options for one deferred-render visit.
 *
 * A visit is the lifetime of the hook (or host) instance. Remounting, which
 * is what a fresh stack push does, starts another visit and may defer again.
 */
export interface UseDeferredRenderOptions {
  /**
   * Stable slug included in performance mark names.
   * Keep it constant for the visit. Changing it starts a new visit.
   */
  screenId: string;
  /**
   * How many stages to release, one per frame after the transition gate.
   * Defaults to 1. Treat as stable for the visit.
   */
  stages?: number;
  /**
   * When false, every stage is ready on the first commit.
   * Content that has already been released is never returned to the placeholder.
   */
  enabled?: boolean;
  /**
   * Backup timeout for each scheduled stage, in milliseconds.
   * Omit it to use 250ms for the first frame-then-idle stage and 100ms for
   * each later frame. The timer starts when that stage is scheduled, before
   * `requestAnimationFrame`.
   */
  frameTimeoutMs?: number;
  /**
   * Called once per visit, after the last deferred stage's children have
   * committed. Not called when the visit unmounts before that commit.
   */
  onDeferredComplete?: () => void;
}

/** Readiness for the current visit. Values only move forward. */
export interface UseDeferredRenderResult {
  /** Highest released stage index, or -1 while every stage is still deferred. */
  releasedStage: number;
  /** True once every declared stage has been released. */
  isComplete: boolean;
  /** True when `stage` (default 0) has been released for this visit. */
  isStageReady: (stage?: number) => boolean;
}

export interface DeferredRenderHostProps extends UseDeferredRenderOptions {
  children: ReactNode;
}

export interface DeferredRenderProps {
  /**
   * Stage index inside a {@link DeferredRenderHost}. Ignored when this
   * component owns its own single-stage visit (no host).
   */
  stage?: number;
  /**
   * Reserved height, in density-independent pixels, while children are
   * deferred. Match the final layout so the reveal does not shift content.
   */
  estimatedHeight: number;
  children: ReactNode;
  /** Placeholder testID. Defaults to `deferred-render-placeholder-${stage}`. */
  testID?: string;
  /**
   * Required when this component is not inside a host. Ignored for
   * scheduling when a host already owns the visit.
   */
  screenId?: string;
  enabled?: boolean;
  /**
   * Forwarded only when this component creates its own host.
   * See {@link UseDeferredRenderOptions.frameTimeoutMs}.
   */
  frameTimeoutMs?: number;
  /**
   * Used only when this component creates its own host. Inside a host, pass
   * the callback to the host so it fires once for the whole visit.
   */
  onDeferredComplete?: () => void;
}

export interface DeferredPlaceholderProps {
  /** Reserved height in density-independent pixels. */
  height: number;
  testID?: string;
}
