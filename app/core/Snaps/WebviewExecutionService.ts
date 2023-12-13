///: BEGIN:ONLY_INCLUDE_IF(snaps)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
  Job,
  AbstractExecutionService,
  ExecutionServiceArgs,
} from '@metamask/snaps-controllers';
import snapsState from './SnapsState';
import SnapDuplex from './SnapDuplex';

import { BasePostMessageStream } from '@metamask/post-message-stream';
export default class WebviewExecutionService extends AbstractExecutionService<Window> {
  #snapDuplexMap: Map<string, SnapDuplex>;

  constructor({ messenger, setupSnapProvider }: ExecutionServiceArgs) {
    super({
      messenger,
      setupSnapProvider,
    });
    this.#snapDuplexMap = new Map();
  }

  protected async initEnvStream(jobId: string): Promise<{
    worker: any;
    stream: BasePostMessageStream;
  }> {
    const iframeWindow = snapsState.webview;
    const stream = snapsState.stream;

    // The WebviewExecutionService wraps the stream into a Duplex
    // to pass the jobId to the Proxy Service
    const snapStream = new SnapDuplex({
      stream,
      jobId,
    });

    this.#snapDuplexMap.set(jobId, snapStream);

    return { worker: iframeWindow, stream: snapStream };
  }

  protected terminateJob(jobWrapper: Job<Window>): void {
    const snapDuplex = this.#snapDuplexMap.get(jobWrapper.id);
    if (snapDuplex) {
      snapDuplex.destroy();
      this.#snapDuplexMap.delete(jobWrapper.id);
    }
  }
}
///: END:ONLY_INCLUDE_IF
