// Module-local state container for the AdvancedChart WebView.
//
// Replaces the legacy `window.chartWidget`, `window.isChartReady`,
// `window.currentSymbol`, etc. (chartLogic.js lines ~21-60). Module-scoped
// variables — not window.* globals — so behaviour is testable and ownership
// is explicit. Future phases extend this with the OHLCV slice, the indicator
// slice, and so on; the convention is "core state goes here, feature-local
// state goes in features/<feature>/state.ts or overlays/<feature>/state.ts".

import type { ChartTheme, TVChartingLibraryWidget } from './types';

interface CoreState {
  widget: TVChartingLibraryWidget | null;
  isChartReady: boolean;
  currentSymbol: string;
  currentResolution: string;
  theme: ChartTheme | null;
  libraryLoaded: boolean;
  libraryError: string | null;
}

const state: CoreState = {
  widget: null,
  isChartReady: false,
  currentSymbol: 'ASSET',
  currentResolution: '5',
  theme: null,
  libraryLoaded: false,
  libraryError: null,
};

// ----- Widget lifecycle ---------------------------------------------------

export function getWidget(): TVChartingLibraryWidget | null {
  return state.widget;
}

export function setWidget(widget: TVChartingLibraryWidget | null): void {
  state.widget = widget;
}

export function isChartReady(): boolean {
  return state.isChartReady;
}

export function setChartReady(ready: boolean): void {
  state.isChartReady = ready;
}

// ----- Symbol + resolution ------------------------------------------------

export function getCurrentSymbol(): string {
  return state.currentSymbol;
}

export function setCurrentSymbol(symbol: string): void {
  state.currentSymbol = symbol;
}

export function getCurrentResolution(): string {
  return state.currentResolution;
}

export function setCurrentResolution(resolution: string): void {
  state.currentResolution = resolution;
}

// ----- Theme --------------------------------------------------------------

export function getTheme(): ChartTheme | null {
  return state.theme;
}

export function setTheme(theme: ChartTheme): void {
  state.theme = theme;
}

// ----- Library load -------------------------------------------------------

export function isLibraryLoaded(): boolean {
  return state.libraryLoaded;
}

export function setLibraryLoaded(loaded: boolean): void {
  state.libraryLoaded = loaded;
}

export function getLibraryError(): string | null {
  return state.libraryError;
}

export function setLibraryError(error: string | null): void {
  state.libraryError = error;
}

/**
 * Resets state to defaults — useful for unit tests. NOT for runtime use; the
 * WebView is created fresh per mount (the RN side recreates the HTML when
 * the theme or feature flags change).
 */
export function __resetStateForTests(): void {
  state.widget = null;
  state.isChartReady = false;
  state.currentSymbol = 'ASSET';
  state.currentResolution = '5';
  state.theme = null;
  state.libraryLoaded = false;
  state.libraryError = null;
}
