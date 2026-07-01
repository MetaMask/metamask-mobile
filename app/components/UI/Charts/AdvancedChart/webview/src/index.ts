// AdvancedChart WebView IIFE entry point.
//
// Evaluated at runtime inside the WebView after AdvancedChartTemplate has
// inlined window.CONFIG via a preceding <script> block. Calls bootstrap()
// to seed state, wire the RN bridge, register Phase 1 handlers, and begin
// loading the TradingView library.
//
// Future phases register their handlers / overlays / features inside their
// own modules; this file stays a thin entry point.

import { bootstrap } from './core/bootstrap';
import { reportErrorToRN } from './core/bridge';

try {
  bootstrap();
} catch (error) {
  reportErrorToRN(error);
}
