import { AppThemeKey, type Theme } from '../../../../util/theme/models';
import { LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import {
  type LineChromeOptions,
  type LegendOverlayConfig,
  resolveLineChromeOptions,
} from './AdvancedChart.types';
import { chartLogicScript } from './webview';
import { getIndicatorColorsForWebview } from './indicatorColors';

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

const getChartSuccessColor = (theme: Theme): string =>
  theme.themeAppearance === AppThemeKey.light
    ? LIGHT_MODE_SUCCESS_GREEN
    : theme.colors.success.default;

interface ChartFeatures {
  enableDrawingTools?: boolean;
  disabledFeatures?: string[];
  lineChrome?: LineChromeOptions;
  lineColorOverride?: string;
  successColorOverride?: string;
  errorColorOverride?: string;
  currentPriceLineColorOverride?: string;
  legendOverlay?: LegendOverlayConfig;
}

const createConfigScript = (
  libraryUrl: string,
  theme: Theme,
  features: ChartFeatures,
): string => {
  const lc = resolveLineChromeOptions(features.lineChrome);
  const successColor =
    features.successColorOverride ?? getChartSuccessColor(theme);
  const lineColor = features.lineColorOverride ?? successColor;
  const errorColor = features.errorColorOverride ?? theme.colors.error.default;
  return `
window.CONFIG = {
  libraryUrl: '${libraryUrl}',
  theme: {
    backgroundColor: '${theme.colors.background.default}',
    borderColor: '${stripHexAlpha(theme.colors.border.muted)}',
    textColor: '${stripHexAlpha(theme.colors.text.muted)}',
    textAlternativeColor: '${stripHexAlpha(theme.colors.text.alternative)}',
    sectionBackgroundColor: '${stripHexAlpha(theme.colors.background.section)}',
    successColor: '${successColor}',
    lineColor: '${lineColor}',
    errorColor: '${errorColor}',
    primaryColor: '${theme.colors.primary.default}',
    currentPriceColor: '${features.currentPriceLineColorOverride ?? ''}'
  },
  features: {
    enableDrawingTools: ${features.enableDrawingTools ? 'true' : 'false'},
    disabledFeatures: ${JSON.stringify(features.disabledFeatures ?? [])}
  },
  lineChrome: {
    hideTimeScale: ${lc.hideTimeScale ? 'true' : 'false'},
    useCustomLineEndMarker: ${lc.useCustomLineEndMarker ? 'true' : 'false'},
    useCustomDashedLastPriceLine: ${lc.useCustomDashedLastPriceLine ? 'true' : 'false'}
  },
  legendOverlay: ${JSON.stringify(features.legendOverlay ?? { enabled: false })},
  indicatorColors: ${JSON.stringify(getIndicatorColorsForWebview(theme.themeAppearance))}
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
            --chart-background: ${stripHexAlpha(theme.colors.background.default)};
            position: relative;
        }
        /*
         * Chart area fills the entire WebView so TradingView gets the full
         * height passed from React Native.
         */
        #chart_surface {
            position: absolute;
            inset: 0;
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
         * Study legend pills (chartLogic.js): semi-transparent background via color-mix.
         */
        .legend-pill {
            display: inline-flex;
            align-items: center;
            box-sizing: border-box;
            font-family: Geist, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 10px;
            font-weight: 500;
            line-height: 1;
            padding: 1px 6px;
            border-radius: 2px;
            background: color-mix(in srgb, var(--chart-background) 75%, transparent);
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
