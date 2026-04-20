import type { Theme } from '../../../../util/theme/models';
import {
  type LineChromeOptions,
  resolveLineChromeOptions,
} from './AdvancedChart.types';
import { chartLogicScript } from './webview';

/**
 * CDN base URL for the TradingView charting library assets.
 *
 * Production: set MM_CHARTING_LIBRARY_URL to the CloudFront distribution URL
 * (trailing slash required). Defaults to the S3 origin until the CloudFront
 * distribution is delivered by DevOps.
 *
 * Local development: override MM_CHARTING_LIBRARY_URL with a local http-server
 * URL (e.g. http://localhost:8000/) and run:
 * npx http-server --cors -p 8000 <dir-containing-charting_library/>
 */
export const CHARTING_LIBRARY_BASE_URL =
  process.env.MM_CHARTING_LIBRARY_URL ?? '';

const CHARTING_LIBRARY_URL = `${CHARTING_LIBRARY_BASE_URL}`;

/**
 * Scheme + host only (no path) for use in CSP frame-src.
 * TradingView's iframe_loading_same_origin feature loads sameorigin.html from
 * this origin, so frame-src must allow it explicitly.
 * e.g. "https://va-mmcx-terminal.s3.us-east-2.amazonaws.com"
 */
const CHARTING_LIBRARY_ORIGIN = (() => {
  try {
    const { origin } = new URL(CHARTING_LIBRARY_BASE_URL);
    return origin;
  } catch {
    return CHARTING_LIBRARY_BASE_URL;
  }
})();

/**
 * Strip the alpha channel from a hex color string.
 * Design tokens may use 9-char hex (#RRGGBBAA); TradingView expects #RRGGBB.
 */
const stripHexAlpha = (hex: string): string =>
  hex.length === 9 && hex.startsWith('#') ? hex.slice(0, 7) : hex;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const LIGHT_MODE_CHART_GREEN = '#00881A';

const getChartSuccessColor = (theme: Theme): string =>
  theme.themeAppearance === 'light'
    ? LIGHT_MODE_CHART_GREEN
    : theme.colors.success.default;

interface ChartFeatures {
  enableDrawingTools?: boolean;
  disabledFeatures?: string[];
  lineChrome?: LineChromeOptions;
}

const createConfigScript = (
  libraryUrl: string,
  theme: Theme,
  features: ChartFeatures,
): string => {
  const lc = resolveLineChromeOptions(features.lineChrome);
  return `
window.CONFIG = {
  libraryUrl: '${libraryUrl}',
  theme: {
    backgroundColor: '${theme.colors.background.default}',
    borderColor: '${stripHexAlpha(theme.colors.border.muted)}',
    textColor: '${stripHexAlpha(theme.colors.text.muted)}',
    successColor: '${getChartSuccessColor(theme)}',
    errorColor: '${theme.colors.error.default}',
    primaryColor: '${theme.colors.primary.default}'
  },
  features: {
    enableDrawingTools: ${features.enableDrawingTools ? 'true' : 'false'},
    disabledFeatures: ${JSON.stringify(features.disabledFeatures ?? [])}
  },
  lineChrome: {
    hideTimeScale: ${lc.hideTimeScale ? 'true' : 'false'},
    useCustomLineEndMarker: ${lc.useCustomLineEndMarker ? 'true' : 'false'},
    useCustomDashedLastPriceLine: ${lc.useCustomDashedLastPriceLine ? 'true' : 'false'},
    useCustomPriceLabels: ${lc.useCustomPriceLabels ? 'true' : 'false'}
  }
};
`;
};

/**
 * Creates the HTML template for TradingView Advanced Charts.
 *
 * @param theme - MetaMask theme for styling
 * @param features - Optional feature flags forwarded to the WebView
 */
export const createAdvancedChartTemplate = (
  theme: Theme,
  features: ChartFeatures = {},
): string => {
  const configInline = createConfigScript(
    CHARTING_LIBRARY_URL,
    theme,
    features,
  );
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TradingView Advanced Chart</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' ${CHARTING_LIBRARY_BASE_URL}; script-src 'unsafe-inline' ${CHARTING_LIBRARY_BASE_URL}; style-src 'unsafe-inline' ${CHARTING_LIBRARY_BASE_URL}; img-src 'self' data: ${CHARTING_LIBRARY_BASE_URL}; font-src ${CHARTING_LIBRARY_BASE_URL}; worker-src blob:; frame-src 'self' blob: ${CHARTING_LIBRARY_ORIGIN}; connect-src https://price.api.cx.metamask.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none';">
    <style>
        /*
         * Page root: fill the WebView, no scrolling. TradingView draws inside this area.
         */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: ${theme.colors.background.default};
            position: relative;
        }
        /*
         * Chart area sits below a small top inset (16px) so absolutely positioned pills
         * that use top + translateY(-50%) for vertical centering are not clipped by
         * body { overflow: hidden } when the crosshair is near the top of the chart.
         */
        #chart_surface {
            position: absolute;
            left: 0;
            right: 0;
            top: 16px;
            bottom: 0;
            width: 100%;
            box-sizing: border-box;
        }
        /*
         * TradingView mounts the library here; position relative so children can use
         * absolute positioning relative to this box.
         */
        #tv_chart_container {
            width: 100%;
            height: 100%;
            position: relative;
            box-sizing: border-box;
        }
        /*
         * Transparent layer on top of the chart, same size as #chart_surface.
         * - pointer-events: none — touches pass through to the chart (we do not block gestures).
         * - z-index: 50 — above the TV canvas so labels render on top.
         * chartLogic sets left/top on the pills inside; this div only defines the coordinate system.
         */
        #custom-crosshair-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 50;
        }
        /*
         * Shared “pill” look for crosshair price, crosshair time, and last-close labels.
         * - position: absolute — placed by chartLogic (px from overlay edges).
         * - display: none by default; chartLogic sets display:flex when showing a label.
         * - flex + center — keeps text centered inside the pill; gap reserved if an icon is added later.
         * - min-width / padding — minimum tap target; horizontal padding matches design spacing.
         * - ellipsis + nowrap — long strings stay on one line with … if needed.
         * Colors: section background + default text (success theme applied on last-close only).
         */
        .crosshair-label {
            position: absolute;
            display: none;
            box-sizing: border-box;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 22px;
            padding: 0 6px;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-family: Geist, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                Roboto, sans-serif;
            font-size: 12px;
            font-style: normal;
            font-weight: 500;
            line-height: 20px;
            border-radius: 4px;
            background: ${stripHexAlpha(theme.colors.background.section)};
            color: ${stripHexAlpha(theme.colors.text.default)};
        }
        /*
         * Price pills (crosshair + last close): default vertical centering on the Y from chartLogic.
         * - translateY(-50%) — shifts the pill up by half its height so it sits on the crosshair line.
         * - right: 0; left: auto — fallback when JS cannot measure the axis (pill hugs the overlay right).
         * When measurement works, chartLogic sets left/right explicitly and overrides this.
         */
        .crosshair-price-label {
            right: 0;
            left: auto;
            transform: translateY(-50%);
        }
        /*
         * Time pill along the bottom axis: pinned to the bottom of the overlay.
         * - translateX(-50%) — horizontal center of the pill aligns with the inline left set by chartLogic (crosshair X).
         */
        .crosshair-time-label {
            bottom: 0;
            top: auto;
            transform: translateX(-50%);
        }
        /*
         * Last-close: green pill (matches TV last-price line), same stacking context as the overlay.
         */
        #last-close-price-label {
            z-index: 50;
            background: ${stripHexAlpha(getChartSuccessColor(theme))};
            color: ${stripHexAlpha(theme.colors.success.inverse)};
        }
        /*
         * Visible-edge outline pill: same pill metrics as .crosshair-label + .crosshair-price-label
         * as the filled last-close label, but transparent fill + success border and success (green)
         * text for readability on the chart background. Shown only when the series tail is off-screen
         * and lineChrome.useCustomPriceLabels is true (chartLogic.js).
         */
        #custom-series-last-value-label {
            z-index: 55;
            background: transparent;
            border: 1px solid ${stripHexAlpha(getChartSuccessColor(theme))};
            color: ${stripHexAlpha(getChartSuccessColor(theme))};
        }
        /*
         * Crosshair price pill draws above last-close when both share the same Y so text stays readable.
         */
        #crosshair-price-label {
            z-index: 60;
        }
        /*
         * Full-screen loading state until the chart is ready; centered message, above all chart UI.
         */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${theme.colors.background.default};
            color: ${theme.colors.text.muted};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 1000;
        }
        .loading-overlay.hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div id="loading-overlay" class="loading-overlay">Loading chart...</div>
    <div id="chart_surface">
        <div id="tv_chart_container"></div>
        <div id="custom-crosshair-overlay" aria-hidden="true">
            <div id="last-close-price-label" class="crosshair-label crosshair-price-label" style="display: none;"></div>
            <div id="custom-series-last-value-label" class="crosshair-label crosshair-price-label" style="display: none;" aria-hidden="true"></div>
            <div id="crosshair-price-label" class="crosshair-label crosshair-price-label"></div>
            <div id="crosshair-time-label" class="crosshair-label crosshair-time-label"></div>
        </div>
    </div>

    <script type="text/javascript">
        ${configInline}
    </script>
    <script type="text/javascript">
        ${chartLogicScript}
    </script>
</body>
</html>
`;
};

export default createAdvancedChartTemplate;
