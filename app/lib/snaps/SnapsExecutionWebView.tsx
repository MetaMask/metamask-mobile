///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { Component } from 'react';
import { View, NativeSyntheticEvent, Platform } from 'react-native';
import { WebViewMessageEvent, WebView } from '@metamask/react-native-webview';
import { createStyles } from './styles';
import { WebViewInterface } from '@metamask/snaps-controllers/react-native';
import { WebViewError } from '@metamask/react-native-webview/src/WebViewTypes';
import { PostMessageEvent } from '@metamask/post-message-stream';
// @ts-expect-error Types are currently broken for this.
import WebViewHTML from '@metamask/snaps-execution-environments/dist/webpack/webview/index.html';
import { EmptyObject } from '@metamask/snaps-sdk';
import Logger from '../../util/Logger';
import { isE2E, isTest } from '../../util/test/utils';

const styles = createStyles();

// This is a hack to allow us to asynchronously await the creation of the WebView.
// eslint-disable-next-line import/no-mutable-exports
export let createWebView: (jobId: string) => Promise<WebViewInterface>;
// eslint-disable-next-line import/no-mutable-exports
export let removeWebView: (jobId: string) => void;

interface WebViewState {
  ref?: WebView;
  listener?: (event: PostMessageEvent) => void;
  jobId?: string;
  props: {
    onWebViewMessage: (data: WebViewMessageEvent) => void;
    onWebViewLoad: () => void;
    onWebViewError: (error: NativeSyntheticEvent<WebViewError>) => void;
    onHttpError?: (
      syntheticEvent: NativeSyntheticEvent<{
        statusCode: number;
        url: string;
        description: string;
      }>,
    ) => void;
    onRenderProcessGone?: (
      syntheticEvent: NativeSyntheticEvent<{ didCrash: boolean }>,
    ) => void;
    onContentProcessDidTerminate?: () => void;
    ref: (ref: WebView) => void;
  };
}

// This is a class component because storing the references we are don't work in functional components.
export class SnapsExecutionWebView extends Component {
  webViews: Record<string, WebViewState> = {};

  constructor(props: EmptyObject) {
    super(props);

    createWebView = this.createWebView.bind(this);
    removeWebView = this.removeWebView.bind(this);
  }

  createWebView(jobId: string) {
    const promise = new Promise<WebViewInterface>((resolve, reject) => {
      const logMessage = `[SnapsExecutionWebView] Creating WebView jobId: ${jobId}`;
      Logger.log(logMessage);
      // Also log to console for CI visibility
      if (isE2E || isTest) {
        console.log(logMessage); // eslint-disable-line no-console
      }

      const onWebViewLoad = () => {
        const loadMessage = `[SnapsExecutionWebView] WebView loaded successfully jobId: ${jobId}`;
        Logger.log(loadMessage);
        // Also log to console for CI visibility
        if (isE2E || isTest) {
          console.log(loadMessage); // eslint-disable-line no-console
        }

        // Inject JavaScript error handler to capture errors
        // Note: We cannot access console directly due to LavaMoat scuttling mode
        // Instead, we only capture window errors and unhandled rejections
        const errorHandlerScript = `
          (function() {
            // Check if console is accessible before trying to use it
            let consoleAccessible = false;
            try {
              // Try to access console - this will throw in LavaMoat scuttling mode
              if (typeof console !== 'undefined' && console.error) {
                consoleAccessible = true;
              }
            } catch (e) {
              // Console is not accessible (LavaMoat scuttling mode)
              consoleAccessible = false;
            }
            
            // Only wrap console methods if accessible
            if (consoleAccessible) {
              try {
                const originalError = console.error;
                const originalWarn = console.warn;
                const originalLog = console.log;
                
                console.error = function(...args) {
                  try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'console-error',
                      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
                      timestamp: Date.now()
                    }));
                  } catch (e) {
                    // Ignore postMessage errors
                  }
                  if (originalError) {
                    originalError.apply(console, args);
                  }
                };
                
                console.warn = function(...args) {
                  try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'console-warn',
                      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
                      timestamp: Date.now()
                    }));
                  } catch (e) {
                    // Ignore postMessage errors
                  }
                  if (originalWarn) {
                    originalWarn.apply(console, args);
                  }
                };
              } catch (e) {
                // Console wrapping failed, continue without it
              }
            }
            
            // Always capture window errors (these don't require console access)
            window.addEventListener('error', function(event) {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'window-error',
                  message: event.message || 'Unknown error',
                  filename: event.filename || 'unknown',
                  lineno: event.lineno || 0,
                  colno: event.colno || 0,
                  error: event.error ? (event.error.stack || event.error.toString()) : 'No error object',
                  timestamp: Date.now()
                }));
              } catch (e) {
                // Ignore postMessage errors
              }
            });
            
            // Always capture unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
              try {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'unhandled-rejection',
                  reason: event.reason ? (event.reason.toString() || JSON.stringify(event.reason)) : 'Unknown rejection',
                  timestamp: Date.now()
                }));
              } catch (e) {
                // Ignore postMessage errors
              }
            });
          })();
        `;

        // Inject error handler after a short delay to ensure WebView is ready
        setTimeout(() => {
          this.webViews[jobId]?.ref?.injectJavaScript(errorHandlerScript);
        }, 100);

        const api = {
          injectJavaScript: (js: string) => {
            this.webViews[jobId]?.ref?.injectJavaScript(js);
          },
          registerMessageListener: (
            listener: (event: PostMessageEvent) => void,
          ) => {
            if (this.webViews[jobId]) {
              this.webViews[jobId].listener = listener;
            }
          },
          unregisterMessageListener: (
            _listener: (event: PostMessageEvent) => void,
          ) => {
            if (this.webViews[jobId]) {
              this.webViews[jobId].listener = undefined;
            }
          },
        };
        resolve(api);
      };

      const onWebViewMessage = (data: WebViewMessageEvent) => {
        try {
          // Check if this is a console error/warning message from our injected script
          const messageData = data.nativeEvent.data;
          if (typeof messageData === 'string') {
            try {
              const parsed = JSON.parse(messageData);
              if (
                parsed.type?.startsWith('console-') ||
                parsed.type === 'window-error' ||
                parsed.type === 'unhandled-rejection'
              ) {
                const errorMessage = `[SnapsExecutionWebView] ${parsed.type}: ${parsed.message || parsed.reason || 'Unknown'}`;
                const error = new Error(errorMessage);
                Logger.error(error, {
                  tags: {
                    component: 'SnapsExecutionWebView',
                    errorType: parsed.type,
                    jobId,
                  },
                  context: {
                    name: 'webview_console_error',
                    data: {
                      message: parsed.message || parsed.reason,
                      filename: parsed.filename,
                      lineno: parsed.lineno,
                      colno: parsed.colno,
                      error: parsed.error,
                      timestamp: parsed.timestamp,
                    },
                  },
                });
                // Also log to console for CI visibility
                if (isE2E || isTest) {
                  console.error(errorMessage, {
                    type: parsed.type,
                    message: parsed.message || parsed.reason,
                    filename: parsed.filename,
                    lineno: parsed.lineno,
                    colno: parsed.colno,
                    error: parsed.error,
                    timestamp: parsed.timestamp,
                  }); // eslint-disable-line no-console
                }
                // Continue processing - don't return early
              }
            } catch {
              // Not a JSON error message, continue with normal message handling
            }
          }
        } catch (error) {
          Logger.error(
            error instanceof Error ? error : new Error(String(error)),
            {
              tags: {
                component: 'SnapsExecutionWebView',
                action: 'message_parsing',
                jobId,
              },
            },
          );
        }

        // Handle normal postMessage events
        if (this.webViews[jobId]?.listener) {
          this.webViews[jobId].listener?.(
            data.nativeEvent as unknown as PostMessageEvent,
          );
        }
      };

      const onWebViewError = (error: NativeSyntheticEvent<WebViewError>) => {
        const errorDetails = error.nativeEvent;
        const errorMessage = `[SnapsExecutionWebView] WebView error: ${errorDetails.description || 'Unknown error'}`;
        const errorObj = new Error(errorMessage);
        Logger.error(errorObj, {
          tags: {
            component: 'SnapsExecutionWebView',
            errorType: 'webview_error',
            jobId,
            platform: Platform.OS,
          },
          context: {
            name: 'webview_error',
            data: {
              description: errorDetails.description,
              domain: errorDetails.domain,
              code: errorDetails.code,
              url: errorDetails.url,
            },
          },
        });
        // Also log to console for CI visibility
        if (isE2E || isTest) {
          console.error(errorMessage, {
            jobId,
            platform: Platform.OS,
            description: errorDetails.description,
            domain: errorDetails.domain,
            code: errorDetails.code,
            url: errorDetails.url,
          }); // eslint-disable-line no-console
        }
        reject(error);
      };

      const onHttpError = (
        syntheticEvent: NativeSyntheticEvent<{
          statusCode: number;
          url: string;
          description: string;
        }>,
      ) => {
        const { statusCode, url, description } = syntheticEvent.nativeEvent;
        const errorMessage = `[SnapsExecutionWebView] HTTP error: ${statusCode} - ${description}`;
        Logger.error(new Error(errorMessage), {
          tags: {
            component: 'SnapsExecutionWebView',
            errorType: 'http_error',
            jobId,
            statusCode: statusCode.toString(),
          },
          context: {
            name: 'webview_http_error',
            data: {
              statusCode,
              url,
              description,
            },
          },
        });
        // Also log to console for CI visibility
        if (isE2E || isTest) {
          console.error(errorMessage, { jobId, statusCode, url, description }); // eslint-disable-line no-console
        }
      };

      const onRenderProcessGone = (
        syntheticEvent: NativeSyntheticEvent<{ didCrash: boolean }>,
      ) => {
        const { didCrash } = syntheticEvent.nativeEvent;
        const errorMessage = `[SnapsExecutionWebView] Render process ${didCrash ? 'crashed' : 'terminated'}`;
        Logger.error(new Error(errorMessage), {
          tags: {
            component: 'SnapsExecutionWebView',
            errorType: 'render_process_gone',
            jobId,
            didCrash: didCrash.toString(),
            platform: 'android',
          },
          context: {
            name: 'webview_render_process_gone',
            data: {
              didCrash,
            },
          },
        });
        // Also log to console for CI visibility
        if (isE2E || isTest) {
          console.error(errorMessage, { jobId, didCrash }); // eslint-disable-line no-console
        }
      };

      const onContentProcessDidTerminate = () => {
        const errorMessage =
          '[SnapsExecutionWebView] Content process terminated';
        Logger.error(new Error(errorMessage), {
          tags: {
            component: 'SnapsExecutionWebView',
            errorType: 'content_process_terminated',
            jobId,
            platform: 'ios',
          },
          context: {
            name: 'webview_content_process_terminated',
            data: {},
          },
        });
        // Also log to console for CI visibility
        if (isE2E || isTest) {
          console.error(errorMessage, { jobId }); // eslint-disable-line no-console
        }
      };

      const setWebViewRef = (ref: WebView) => {
        if (this.webViews[jobId]) {
          this.webViews[jobId].ref = ref;
        }
      };

      this.webViews[jobId] = {
        jobId,
        props: {
          onWebViewLoad,
          onWebViewError,
          onWebViewMessage,
          onHttpError,
          onRenderProcessGone:
            Platform.OS === 'android' ? onRenderProcessGone : undefined,
          onContentProcessDidTerminate:
            Platform.OS === 'ios' ? onContentProcessDidTerminate : undefined,
          ref: setWebViewRef,
        },
      };
    });

    // Force re-render.
    this.forceUpdate();

    return promise;
  }

  removeWebView(jobId: string) {
    const logMessage = `[SnapsExecutionWebView] Removing WebView jobId: ${jobId}`;
    Logger.log(logMessage);
    // Also log to console for CI visibility
    if (isE2E || isTest) {
      console.log(logMessage); // eslint-disable-line no-console
    }
    delete this.webViews[jobId];

    // Force re-render.
    this.forceUpdate();
  }

  render() {
    return (
      <View style={styles.container}>
        {Object.entries(this.webViews).map(([key, { props }]) => (
          <WebView
            testID={key}
            key={key}
            ref={props.ref}
            source={{ html: WebViewHTML, baseUrl: 'https://localhost' }}
            onMessage={props.onWebViewMessage}
            onError={props.onWebViewError}
            onLoadEnd={props.onWebViewLoad}
            onHttpError={props.onHttpError}
            onRenderProcessGone={props.onRenderProcessGone}
            onContentProcessDidTerminate={props.onContentProcessDidTerminate}
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
