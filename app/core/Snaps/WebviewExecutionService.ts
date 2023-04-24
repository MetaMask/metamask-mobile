// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  BasePostMessageStream,
  Job,
  AbstractExecutionService,
  ExecutionServiceArgs,
} from '@metamask/snaps-controllers';
import snapsState from './SnapsState';
// import SnapWebviewPostMessageStream from './SnapWebviewPostMessageStream';
import SnapDuplex from './SnapDuplex';

// const ObjectMultiplex = require('obj-multiplex');

// type IframeExecutionEnvironmentServiceArgs = {
//   iframeUrl: URL;
// } & ExecutionServiceArgs;

export default class WebviewExecutionService extends AbstractExecutionService<Window> {
  #snapDuplexMap: SnapDuplex[];

  constructor({ messenger, setupSnapProvider }: ExecutionServiceArgs) {
    super({
      messenger,
      setupSnapProvider,
    });
    // this.iframeUrl = iframeUrl;
    this.#snapDuplexMap = {};
  }

  protected async initEnvStream(jobId: string): Promise<{
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

  protected terminateJob(jobWrapper: Job<Window>): void {
    this.#snapDuplexMap[jobWrapper.id].destroy();
    delete this.#snapDuplexMap[jobWrapper.id];

    // eslint-disable-next-line no-console
    console.log(
      '[EXEC SERVICE LOG] WebviewExecutionService+_terminate: Job',
      jobWrapper.id,
      'SnapDuplex destroyed',
    );
  }
}
