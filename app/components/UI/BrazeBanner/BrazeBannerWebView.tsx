import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { type Banner } from '@braze/react-native-sdk';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';

interface BrazeBannerWebViewProps {
  banner: Banner;
}

/**
 * Content-Security-Policy applied to every banner document.
 *
 * Rationale for each directive:
 * - default-src 'none' — explicit deny-all baseline
 * - img-src https: data: — allow inline (data:) and remote (https:) images
 *   without cookies (incognito + sharedCookiesEnabled=false); the no-referrer
 *   meta suppresses the Referer header
 * - style-src 'unsafe-inline' — Braze HTML uses inline styles; external
 *   stylesheets are blocked
 * - font-src data: — only inline (data URI) fonts allowed
 * - base-uri 'none' — prevents base-href hijacks
 * - form-action 'none' — no form submissions
 * - frame-src 'none' — no iframes / frames
 * - object-src 'none' — no object / embed elements
 */
const BANNER_CSP = `default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none';`;

/**
 * Wraps the raw Braze HTML payload in a document that:
 * - enforces the CSP above via meta http-equiv
 * - suppresses the Referer header via meta name="referrer"
 * - sets a neutral viewport
 */
function wrapBannerHtml(html: string): string {
  return `<!doctype html><html><head>\
<meta charset="utf-8">\
<meta http-equiv="Content-Security-Policy" content="${BANNER_CSP}">\
<meta name="referrer" content="no-referrer">\
<meta name="viewport" content="width=device-width,initial-scale=1">\
</head><body style="margin:0">${html}</body></html>`;
}

/**
 * Renders a Braze banner's HTML payload as a static, non-interactive surface.
 *
 * JavaScript is disabled — there is nothing to execute. Touch interception and
 * click/deeplink routing are handled by the Pressable overlay in BrazeBanner,
 * keeping all logic at the React Native layer.
 *
 * Security posture:
 * - CSP blocks scripts, iframes, forms, objects, and external fonts.
 * - no-referrer suppresses the Referer header on permitted subresource loads.
 * - incognito mode disables persistent WebView storage and the shared cookie
 *   jar, preventing session-cookie leakage on subresource fetches.
 * - File-system and cross-origin access is explicitly disabled.
 * - Mixed content is blocked on Android.
 * - Multi-window / target=_blank popups are blocked on Android.
 */
const BrazeBannerWebView = ({ banner }: BrazeBannerWebViewProps) => (
  <WebView
    testID={BRAZE_BANNER_TEST_IDS.WEBVIEW}
    source={{ html: wrapBannerHtml(banner.html), baseUrl: 'about:blank' }}
    originWhitelist={['about:blank']}
    javaScriptEnabled={false}
    scrollEnabled={false}
    style={StyleSheet.absoluteFillObject}
    allowsLinkPreview={false}
    onShouldStartLoadWithRequest={({ url }) => url === 'about:blank'}
    mediaPlaybackRequiresUserAction
    // Isolation: disable persistent cache, storage, and shared cookie jar so
    // subresource fetches cannot read or write any app-level session state.
    incognito
    cacheEnabled={false}
    domStorageEnabled={false}
    sharedCookiesEnabled={false}
    thirdPartyCookiesEnabled={false}
    // Block mixed HTTP content on Android.
    mixedContentMode="never"
    // Block file-system access (defence-in-depth alongside the CSP).
    allowFileAccess={false}
    allowFileAccessFromFileURLs={false}
    allowUniversalAccessFromFileURLs={false}
    // Block window.open and target=_blank popups on Android.
    setSupportMultipleWindows={false}
  />
);

export default BrazeBannerWebView;
