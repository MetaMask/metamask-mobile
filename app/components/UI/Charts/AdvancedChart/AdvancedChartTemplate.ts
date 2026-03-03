import type { Theme } from '../../../../util/theme/models';
import { chartLogicScript } from './webview';

// AWS S3 - CORS configured to allow origin: null from WebView iframes
export const CHARTING_LIBRARY_BASE_URL =
  'https://va-mmcx-terminal.s3.us-east-2.amazonaws.com/charting_library/';
const CHARTING_LIBRARY_URL = `${CHARTING_LIBRARY_BASE_URL}charting_library/`;

// Local development server fallback:
//   npx http-server --cors -p 8000 <dir-containing-charting_library/>
// export const CHARTING_LIBRARY_BASE_URL = 'http://localhost:8000/';
// const CHARTING_LIBRARY_URL = `${CHARTING_LIBRARY_BASE_URL}charting_library/`;

/**
 * Strip the alpha channel from a hex color string.
 * Design tokens may use 9-char hex (#RRGGBBAA); TradingView expects #RRGGBB.
 */
const stripHexAlpha = (hex: string): string =>
  hex.length === 9 && hex.startsWith('#') ? hex.slice(0, 7) : hex;

interface ChartFeatures {
  enableDrawingTools?: boolean;
  showVolume?: boolean;
  disabledFeatures?: string[];
}

const createConfigScript = (
  libraryUrl: string,
  theme: Theme,
  features: ChartFeatures,
): string => `
window.CONFIG = {
  libraryUrl: '${libraryUrl}',
  theme: {
    backgroundColor: '${theme.colors.background.default}',
    borderColor: '${stripHexAlpha(theme.colors.border.muted)}',
    textColor: '${theme.colors.text.alternative}',
    successColor: '${theme.colors.success.default}',
    errorColor: '${theme.colors.error.default}',
    primaryColor: '${theme.colors.primary.default}'
  },
  features: {
    enableDrawingTools: ${features.enableDrawingTools ? 'true' : 'false'},
    showVolume: ${features.showVolume ? 'true' : 'false'},
    disabledFeatures: ${JSON.stringify(features.disabledFeatures ?? [])}
  }
};
`;

/**
 * Creates the HTML template for TradingView Advanced Charts.
 *
 * @param theme - MetaMask theme for styling
 * @param features - Optional feature flags forwarded to the WebView
 */
export const createAdvancedChartTemplate = (
  theme: Theme,
  features: ChartFeatures = {},
): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TradingView Advanced Chart</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' ${CHARTING_LIBRARY_BASE_URL}; script-src 'unsafe-inline' ${CHARTING_LIBRARY_BASE_URL}; style-src 'unsafe-inline' ${CHARTING_LIBRARY_BASE_URL}; img-src 'self' data: ${CHARTING_LIBRARY_BASE_URL}; font-src ${CHARTING_LIBRARY_BASE_URL}; worker-src blob:; frame-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none';">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: ${theme.colors.background.default};
        }
        #tv_chart_container {
            width: 100%;
            height: 100%;
            position: relative;
        }
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
    <div id="tv_chart_container"></div>

    <script type="text/javascript">
        ${createConfigScript(CHARTING_LIBRARY_URL, theme, features)}
    </script>
    <script type="text/javascript">
        ${chartLogicScript}
    </script>
</body>
</html>
`;

export default createAdvancedChartTemplate;
