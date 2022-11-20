import {
  AbstractExecutionService,
  SetupSnapProvider,
  ExecutionServiceMessenger,
} from '@metamask/snap-controllers';
import { BasePostMessageStream } from '@metamask/post-message-stream';

interface SnapExecutionServiceArgs {
  iframeUrl: URL;
  setupSnapProvider: SetupSnapProvider;
  messenger: ExecutionServiceMessenger;
  terminationTimeout?: number;
}

class SnapExecutionService extends AbstractExecutionService<Window> {
  public iframeUrl: URL;

  constructor({
    iframeUrl,
    setupSnapProvider,
    messenger,
    terminationTimeout,
  }: SnapExecutionServiceArgs) {
    super({ setupSnapProvider, messenger, terminationTimeout });
    this.iframeUrl = iframeUrl;
  }

  protected async initEnvStream(jobId: string): Promise<{
    worker: Window;
    stream: BasePostMessageStream;
  }> {
    const iframeWindow = await this.createWindow(
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
}

export default SnapExecutionService;
