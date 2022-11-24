import {
  AbstractExecutionService,
  ExecutionServiceArgs,
  Job,
} from '@metamask/snap-controllers';
import {
  BasePostMessageStream,
  WindowPostMessageStream,
} from '@metamask/post-message-stream';

type SnapExecutionServiceArgs = {
  iframeUrl: URL;
  webViewRef: any;
} & ExecutionServiceArgs;

interface WebViewWorker {
  createWindow: void;
  postMessage: (data: unknown) => void;
}

class SnapExecutionService extends AbstractExecutionService<WebViewWorker> {
  public iframeUrl: URL;
  private webViewRef: any;

  constructor({
    iframeUrl,
    webViewRef,
    setupSnapProvider,
    messenger,
    terminationTimeout,
  }: SnapExecutionServiceArgs) {
    super({ setupSnapProvider, messenger, terminationTimeout });
    this.iframeUrl = iframeUrl;
    this.webViewRef = webViewRef;
  }

  protected _terminate(jobWrapper: Job<WebViewWorker>): void {
    this.webViewRef.current.postMessage(
      JSON.stringify({
        method: 'create_window',
        args: {
          windowId: jobWrapper.id,
        },
      }),
    );
  }

  protected async _initEnvStream(jobId: string): Promise<{
    worker: WebViewWorker;
    stream: BasePostMessageStream;
  }> {
    const iframeWindow = await this._createWindow(
      this.iframeUrl.toString(),
      jobId,
    );
    const stream = new WindowPostMessageStream({
      name: 'parent',
      target: 'child',
      targetWindow: iframeWindow,
      targetOrigin: '*',
    });

    return { worker: iframeWindow, stream };
  }

  protected _createWindow(url: string, windowId: string): WebViewWorker {
    if (!this.webViewRef?.current) {
      throw new Error('WebView reference required');
    }

    const worker = this.webViewRef.current.postMessage(
      JSON.stringify({
        method: 'create_window',
        args: {
          url,
          windowId,
        },
      }),
    );

    return worker;
  }
}

export default SnapExecutionService;
