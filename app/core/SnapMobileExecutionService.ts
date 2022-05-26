import { Duplex } from 'stream';
import { ExecutionServiceMessenger } from '@metamask/snap-types';
import { JsonRpcEngine } from 'json-rpc-engine';
import { createStreamMiddleware } from 'json-rpc-middleware-stream';
import { nanoid } from 'nanoid';
import pump from 'pump';
import {
  AbstractExecutionService,
  setupMultiplex,
} from '@metamask/snap-controllers';
import WebView from 'react-native-webview';
import SnapMobilePostMessageStream from './SnapMobilePostMessageStream';

interface IframeExecutionEnvironmentServiceArgs {
  createWindowTimeout?: number;
  setupSnapProvider?: any;
  iframeUrl: URL;
  messenger: ExecutionServiceMessenger;
}

interface JobStreams {
  command: Duplex;
  rpc: Duplex | null;
  _connection: SnapMobilePostMessageStream;
}

interface EnvMetadata {
  id: string;
  streams: JobStreams;
  rpcEngine: JsonRpcEngine;
}

export default class MobileIframeExecutionService extends AbstractExecutionService<EnvMetadata> {
  public webView?: WebView;
  public rootStream?: SnapMobilePostMessageStream;

  constructor({
    setupSnapProvider,
    messenger,
  }: IframeExecutionEnvironmentServiceArgs) {
    super({
      setupSnapProvider,
      messenger,
    });
  }

  public setWebview(webview: WebView) {
    this.webView = webview;
    this.rootStream?.setWebView(this.webView);
  }

  protected _terminate(jobWrapper: EnvMetadata): void {
    // find by jobid
    // tear down react native webview
  }

  protected async _initJob(): Promise<EnvMetadata> {
    const jobId = nanoid();
    const streams = await this._initStreams(jobId);
    const rpcEngine = new JsonRpcEngine();

    const jsonRpcConnection = createStreamMiddleware();

    pump(jsonRpcConnection.stream, streams.command, jsonRpcConnection.stream);

    rpcEngine.push(jsonRpcConnection.middleware);

    const envMetadata = {
      id: jobId,
      streams,
      rpcEngine,
    };
    this.jobs.set(jobId, envMetadata);

    return envMetadata;
  }

  private async _initStreams(jobId: string): Promise<any> {
    // ReactNativeWebviewMessageStream
    this.rootStream = new SnapMobilePostMessageStream({
      name: 'parent',
      target: 'child',
    });
    // Typecast justification: stream type mismatch
    const mux = setupMultiplex(
      this.rootStream as unknown as Duplex,
      `Job: "${jobId}"`,
    );

    const commandStream: any = mux.createStream(SNAP_STREAM_NAMES.COMMAND);

    // Handle out-of-band errors, i.e. errors thrown from the snap outside of the req/res cycle.
    const errorHandler = (data: any) => {
      if (
        data.error &&
        (data.id === null || data.id === undefined) // only out of band errors (i.e. no id)
      ) {
        const snapId = this.jobToSnapMap.get(jobId);
        if (snapId) {
          this._messenger.publish(
            'ExecutionService:unhandledError',
            snapId,
            data.error,
          );
        }
        commandStream.removeListener('data', errorHandler);
      }
    };
    commandStream.on('data', errorHandler);
    const rpcStream = mux.createStream(SNAP_STREAM_NAMES.JSON_RPC);

    // Typecast: stream type mismatch
    return {
      command: commandStream as unknown as Duplex,
      rpc: rpcStream,
      _connection: this.rootStream,
    };
  }

  /**
   * Creates the iframe to be used as the execution environment
   * This may run forever if the iframe never loads, but the promise should be wrapped in an initialization timeout in the SnapController
   *
   * @param uri - The iframe URI
   * @param jobId - The job id
   */
  private _createWindow(_: string, __: string): any {
    // react native webview
    // load the uri
    // store it somewhere by jobid
    // const iframe = document.createElement('iframe');
    // return new Promise((resolve) => {
    //   iframe.addEventListener('load', () => {
    //     if (iframe.contentWindow) {
    //       resolve(iframe.contentWindow);
    //     }
    //   });
    //   document.body.appendChild(iframe);
    //   iframe.setAttribute('src', uri);
    //   iframe.setAttribute('id', jobId);
    //   iframe.setAttribute('sandbox', 'allow-scripts');
    // });
  }
}
