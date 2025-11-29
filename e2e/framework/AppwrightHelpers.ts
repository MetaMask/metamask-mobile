import { Device } from 'appwright';

export default class AppwrightHelpers {
  static async switchToNativeContext(deviceInstance: Device): Promise<void> {
    return await this.switchContext(deviceInstance, 'NATIVE_APP');
  }

  static async switchToWebViewContext(
    deviceInstance: Device,
    dappUrl: string,
  ): Promise<void> {
    return await this.switchContext(deviceInstance, 'WEBVIEW', dappUrl);
  }

  private static async switchContext(
    deviceInstance: Device,
    context: 'NATIVE_APP' | 'WEBVIEW',
    dappUrl?: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webDriverClient = (deviceInstance as any).webDriverClient;
    const availableContexts = await webDriverClient.getContexts();

    if (context === 'WEBVIEW') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webviewContext = availableContexts.find((context: any) => {
        if (typeof context === 'string') {
          return context.includes('WEBVIEW');
        } else if (typeof context === 'object' && context !== null) {
          const contextUrl = context.url || '';
          return contextUrl.includes(dappUrl || '');
        }
        return false;
      });
      console.log('Selected webview context:', webviewContext);

      if (webviewContext) {
        // Use the id property if it's an object, otherwise use the context directly
        const contextId =
          typeof webviewContext === 'object'
            ? webviewContext.id
            : webviewContext;
        console.log(`Switching to context ID: ${contextId}`);
        await webDriverClient.switchContext(contextId);
        console.log('Successfully switched context');
      } else {
        console.log('No matching webview context found');
      }
    }

    const nativeContext = availableContexts.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx: any) => (typeof ctx === 'string' ? ctx : ctx.id) === 'NATIVE_APP',
    );
    try {
      if (nativeContext) {
        const contextId =
          typeof nativeContext === 'string' ? nativeContext : nativeContext.id;
        await webDriverClient.switchContext(contextId);
      } else {
        console.log('Native context not found in available contexts');
      }
    } catch (error) {
      console.log('Error switching to native context:', error);
    }
  }
}
