import createInvoke from 'react-native-webview-invoke/native';
import { WebView } from 'react-native-webview';
import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import asyncInvoke from './invoke-lib.js';
import Logger from '../../util/Logger.js';
import { html } from './ppom.html.js';

const styles = StyleSheet.create({
  webViewContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});

let invoke;

export class PPOM {
  _new = invoke.bind('PPOM.new');
  _free = invoke.bind('PPOM.free');
  _test = invoke.bindAsync('PPOM.test');
  _validateJsonRpc = invoke.bindAsync('PPOM.validateJsonRpc');

  _convertFilesToBase64(files) {
    return files.map(([key, value]) => {
      const base64 = window.Buffer.from(value).toString('base64');
      return [key, base64];
    });
  }

  constructor(jsoRpc, files) {
    invoke.defineAsync('PPOM.jsonRpc', jsoRpc);
    files = this._convertFilesToBase64(files);
    this.initPromise = this._new(files);
  }

  async free() {
    await this.initPromise;
    await this._free();
    this.initPromise = undefined;
  }

  async test() {
    await this.initPromise;
    return await this._test();
  }

  async validateJsonRpc(...args) {
    await this.initPromise;
    return await this._validateJsonRpc(...args);
  }
}

export const ppomInit = async () => {
  await invoke.bindAsync('ppomInit')();
};

export class PPOMView extends Component {
  webViewRef = React.createRef();
  invoke = createInvoke(() => this.webViewRef.current);

  constructor(props) {
    super(props);
    asyncInvoke(this.invoke);

    this.invoke.define('console.log', (...args) =>
      Logger.log('[PPOMView]', ...args),
    );
    this.invoke.define('console.error', (...args) =>
      Logger.error('[PPOMView]', ...args),
    );
    this.invoke.define('console.warn', (...args) =>
      Logger.warn('[PPOMView]', ...args),
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
