///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { Component } from 'react';
import { View } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import {
  WebViewNavigationEvent,
  WebViewErrorEvent,
} from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import { assert, hasProperty } from '@metamask/utils';
import Logger from '../../util/Logger';

const styles = createStyles();

// Number of spare WebViews kept booted ahead of time. Booting an execution-env
// WebView pays the SES `lockdown()` + ~900 KB env bootstrap cost; pre-warming a
// spare moves that cost OFF the critical path of the first Snap RPC. The realm
// model is unchanged (still one WebView per Snap) — we just amortize the boot.
// Set to 0 to disable pre-warming entirely.
const WARM_POOL_TARGET = 1;

// This is a hack to allow us to asynchronously await the creation of the WebView.
// eslint-disable-next-line import-x/no-mutable-exports
export let createWebView: (jobId: string) => Promise<WebViewInterface>;
// eslint-disable-next-line import-x/no-mutable-exports
export let removeWebView: (jobId: string) => void;
// Pre-boot spare execution WebViews so the SES lockdown + env bootstrap happens
// before the first Snap needs to run. Safe no-op until the component is mounted.
// eslint-disable-next-line import-x/no-mutable-exports
export let prewarmSnapsWebView: () => void;

interface WebViewState {
  // Stable React key/identity for the rendered WebView. This MUST NOT change
  // once created, otherwise React unmounts and remounts the WebView, throwing
  // away the very boot work we are trying to amortize.
  key: string;
  // The Snap job currently served by this WebView, or undefined while it is a
  // warm (unassigned) spare.
  jobId?: string;
  ref?: WebView;
  listener?: (event: PostMessageEvent) => void;
  // Whether the WebView has booted (received its first message / handshake SYN).
  ready: boolean;
  // Called once when a pending `createWebView` adopts a not-yet-booted WebView.
  onReady?: () => void;
  // Reject for the pending `createWebView` promise (load-error path).
  onError?: (error: Error) => void;
  props: {
    onWebViewMessage: (data: WebViewMessageEvent) => void;
    onWebViewLoad: (event: WebViewNavigationEvent | WebViewErrorEvent) => void;
    ref: (ref: WebView) => void;
  };
}

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViews: Record<string, WebViewState> = {};

  #keyCounter = 0;

  constructor(props: EmptyObject) {
    super(props);

    createWebView = this.createWebView.bind(this);
    removeWebView = this.removeWebView.bind(this);
    prewarmSnapsWebView = this.prewarm.bind(this);
  }

  // Creates a fresh (warm, unassigned) WebView state with stable handlers bound
  // to the state object so adoption never needs to swap React props/refs.
  #createWebViewState(): WebViewState {
    const key = `snaps-execution-webview-${this.#keyCounter}`;
    this.#keyCounter += 1;

    const state: WebViewState = {
      key,
      ready: false,
      props: {
        onWebViewMessage: (data: WebViewMessageEvent) => {
          if (!state.ready) {
            state.ready = true;
            const onReady = state.onReady;
            state.onReady = undefined;
            onReady?.();
          }

          if (state.jobId && state.listener) {
            try {
              state.listener(data.nativeEvent as unknown as PostMessageEvent);
            } catch (error) {
              Logger.log('Snaps execution webview failure:', error);
            }
          }
        },
        onWebViewLoad: (event: WebViewNavigationEvent | WebViewErrorEvent) => {
          if (!hasProperty(event.nativeEvent, 'code')) {
            return;
          }

          const error = new Error(
            `Snaps execution webview failed to load with error code: ${event.nativeEvent.code}`,
          );

          if (state.onError) {
            // A job is waiting on this WebView; surface the failure to it.
            state.onError(error);
          } else {
            // A warm spare failed before being assigned; drop and refill.
            Logger.log('Snaps execution webview failure:', error);
            this.#discard(state);
          }
        },
        ref: (ref: WebView) => {
          state.ref = ref;
        },
      },
    };

    this.webViews[key] = state;
    return state;
  }

  // Returns an unassigned WebView, preferring one that has already booted.
  #acquireWarmWebView(): WebViewState | undefined {
    const warm = Object.values(this.webViews).filter(
      (state) => state.jobId === undefined,
    );
    return warm.find((state) => state.ready) ?? warm[0];
  }

  // Tops up the warm pool back to the target spare count.
  #ensureWarmPool(): void {
    const warmCount = Object.values(this.webViews).filter(
      (state) => state.jobId === undefined,
    ).length;

    for (let i = warmCount; i < WARM_POOL_TARGET; i += 1) {
      this.#createWebViewState();
    }
  }

  #discard(state: WebViewState): void {
    delete this.webViews[state.key];
    this.#ensureWarmPool();
    this.forceUpdate();
  }

  prewarm() {
    this.#ensureWarmPool();
    this.forceUpdate();
  }

  createWebView(jobId: string) {
    // Reuse a pre-booted spare if available, otherwise boot a fresh one.
    const state = this.#acquireWarmWebView() ?? this.#createWebViewState();
    state.jobId = jobId;

    const api = {
      injectJavaScript: (js: string) => {
        assert(state.ref, 'Snaps execution webview reference not found.');
        state.ref.injectJavaScript(js);
      },
      registerMessageListener: (
        listener: (event: PostMessageEvent) => void,
      ) => {
        state.listener = listener;
      },
      unregisterMessageListener: (
        _listener: (event: PostMessageEvent) => void,
      ) => {
        state.listener = undefined;
      },
    };

    const promise = new Promise<WebViewInterface>((resolve, reject) => {
      state.onError = reject;
      if (state.ready) {
        // Spare already booted: resolve immediately, skipping boot latency.
        resolve(api);
      } else {
        state.onReady = () => resolve(api);
      }
    });

    // Keep a spare warm for the next Snap, off the critical path.
    this.#ensureWarmPool();

    // Force re-render.
    this.forceUpdate();

    return promise;
  }

  removeWebView(jobId: string) {
    const entry = Object.values(this.webViews).find(
      (state) => state.jobId === jobId,
    );

    if (entry) {
      delete this.webViews[entry.key];
    }

    // Replace the torn-down WebView's capacity with a fresh warm spare.
    this.#ensureWarmPool();

    // Force re-render.
    this.forceUpdate();
  }

  render() {
    return (
      <View style={styles.container}>
        {Object.values(this.webViews).map((state) => (
          <WebView
            testID={state.jobId ?? state.key}
            key={state.key}
            ref={state.props.ref}
            source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
            onMessage={state.props.onWebViewMessage}
            onLoadEnd={state.props.onWebViewLoad}
            originWhitelist={['*']}
            javaScriptEnabled
            webviewDebuggingEnabled={__DEV__}
          />
        ))}
      </View>
    );
  }
}
///: END:ONLY_INCLUDE_IF
