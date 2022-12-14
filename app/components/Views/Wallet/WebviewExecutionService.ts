// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  BasePostMessageStream,
  Job,
  AbstractExecutionService,
  ExecutionServiceArgs,
} from '@metamask/snap-controllers';
import snapsState from '../../../core/SnapsState';
// import SnapWebviewPostMessageStream from './SnapWebviewPostMessageStream';
import { SnapDuplex } from './SnapDuplex';

// const ObjectMultiplex = require('obj-multiplex');

type IframeExecutionEnvironmentServiceArgs = {
  iframeUrl: URL;
} & ExecutionServiceArgs;

export default class WebviewExecutionService extends AbstractExecutionService<Window> {
  public iframeUrl: URL;

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
  }

  protected async _initEnvStream(jobId: string): Promise<{
    worker;
    stream: BasePostMessageStream;
  }> {
    // eslint-disable-next-line no-console
    console.log('------------ [INIT ENV STREAM] ------------. Data:', jobId);
    const iframeWindow = snapsState.webview;
    const stream = snapsState.stream;

    const snapStream = new SnapDuplex({
      stream,
      jobId,
    });

    return { worker: iframeWindow, stream: snapStream };
  }

  protected _terminate(jobWrapper: Job<Window>): void {
    // eslint-disable-next-line no-console
    console.log(
      'This method should a command to the WebView to teardown the iframe for the job with ID',
      jobWrapper.id,
    );
  }
}
