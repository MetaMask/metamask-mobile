import createInvoke from 'react-native-webview-invoke/native';
import React, { Component, RefObject } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import Logger from '../../util/Logger.js';
import asyncInvoke from './invoke-lib';
import { html } from './ppom.html.js';

const styles = StyleSheet.create({
  webViewContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});

let invoke: any;

const convertFilesToBase64 = (files: any[][]) =>
  files.map(([key, value]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const base64 = window.Buffer.from(value).toString('base64');
    return [key, base64];
  });

class PPOMInner {
  _new = invoke.bind('PPOM.new');
  _free = invoke.bind('PPOM.free');
  _test = invoke.bindAsync('PPOM.test');
  _validateJsonRpc = invoke.bindAsync('PPOM.validateJsonRpc');
  initPromise: PPOMInner | undefined = undefined;

  constructor(jsoRpc: any, files: any[][]) {
    invoke.defineAsync('PPOM.jsonRpc', jsoRpc);
    files = convertFilesToBase64(files);
    this.initPromise = this._new(files);
  }

  async validateJsonRpc(...args: any[]) {
    await this.initPromise;
    return await this._validateJsonRpc(...args);
  }
}

export const PPOM = {
  new: (arg1: any, arg2: any) => new PPOMInner(arg1, arg2),
};

export const ppomInit = async () => {
  await invoke.bindAsync('ppomInit')();
};

export class PPOMView extends Component {
  webViewRef: RefObject<WebView> = React.createRef();
  invoke = createInvoke(() => this.webViewRef?.current);

  constructor(props: any) {
    super(props);
    asyncInvoke(this.invoke);

    this.invoke.define('console.log', (...args: any[]) =>
      Logger.log('[PPOMView]', ...args),
    );
    this.invoke.define('console.error', (...args: any[]) =>
      Logger.error('[PPOMView]', args),
    );
    this.invoke.define('console.warn', (...args: any[]) =>
      Logger.log('[PPOMView]', ...args),
    );

    this.invoke.define('finishedLoading', this.finishedLoading.bind(this));
  }

  finishedLoading() {
    invoke = this.invoke;
  }

  render() {
    return (
      <View style={styles.webViewContainer}>
        <WebView
          ref={this.webViewRef}
          source={{ html }}
          onMessage={this.invoke.listener}
        />
      </View>
    );
  }
}
