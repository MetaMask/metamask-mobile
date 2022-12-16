// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  BasePostMessageStream,
  Job,
  AbstractExecutionService,
  ExecutionServiceArgs,
} from '@metamask/snap-controllers';
import snapsState from './SnapsState';
// import SnapWebviewPostMessageStream from './SnapWebviewPostMessageStream';
import SnapDuplex from './SnapDuplex';

// const ObjectMultiplex = require('obj-multiplex');

type IframeExecutionEnvironmentServiceArgs = {
  iframeUrl: URL;
} & ExecutionServiceArgs;

export default class WebviewExecutionService extends AbstractExecutionService<Window> {
  public iframeUrl: URL;
  #snapDuplexMap: SnapDuplex[];

  constructor({
    iframeUrl,
    messenger,
    setupSnapProvider,
  }: IframeExecutionEnvironmentServiceArgs) {
    super({
      messenger,
      setupSnapProvider,
    });
    this.iframeUrl = iframeUrl;
    this.#snapDuplexMap = {};
  }

  protected async _initEnvStream(jobId: string): Promise<{
    worker;
    stream: BasePostMessageStream;
  }> {
    // eslint-disable-next-line no-console
    console.log(
      '[EXEC SERVICE LOG] WebviewExecutionService+_initEnvStream: Init env stream for job',
      jobId,
    );
    const iframeWindow = snapsState.webview;
    const stream = snapsState.stream;

    // The WebviewExecutionService wraps the stream into a Duplex
    // to pass the jobId to the Proxy Service
    const snapStream = new SnapDuplex({
      stream,
      jobId,
    });

    this.#snapDuplexMap[jobId] = snapStream;

    return { worker: iframeWindow, stream: snapStream };
  }

  protected _terminate(jobWrapper: Job<Window>): void {
    // eslint-disable-next-line no-console
    console.log(
      'TO DO: This method should send a command to the WebView to teardown the iframe for the job with ID',
      jobWrapper.id,
    );
  }
}
