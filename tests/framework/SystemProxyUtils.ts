/* eslint-disable import/no-nodejs-modules */
import { execSync } from 'child_process';
import { PlatformDetector } from './PlatformLocator';
import { createLogger } from './logger';

const logger = createLogger({
  name: 'SystemProxyUtils',
});

/**
 * Utility class for configuring system-level HTTP proxy on iOS Simulator and Android Emulator.
 *
 * This is crucial for intercepting WebView network traffic (like Snap fetch calls) that
 * doesn't go through the React Native shim.js proxy.
 *
 * iOS: Uses macOS networksetup command (iOS Simulator inherits macOS proxy settings)
 * Android: Uses adb shell settings to configure global HTTP proxy
 */
export class SystemProxyUtils {
  private static originalMacOSProxyState: {
    webProxyEnabled: boolean;
    secureWebProxyEnabled: boolean;
    webProxyServer?: string;
    webProxyPort?: number;
    secureWebProxyServer?: string;
    secureWebProxyPort?: number;
  } | null = null;

  private static androidProxyConfigured = false;

  /**
   * Get the active network service name on macOS (e.g., "Wi-Fi", "Ethernet")
   */
  private static getMacOSNetworkService(): string {
    try {
      // Get the primary network service
      const result = execSync(
        'networksetup -listallnetworkservices | grep -E "Wi-Fi|Ethernet" | head -1',
        { encoding: 'utf-8' },
      ).trim();

      if (result) {
        return result;
      }

      // Fallback to Wi-Fi
      return 'Wi-Fi';
    } catch {
      return 'Wi-Fi';
    }
  }

  /**
   * Save current macOS proxy state so we can restore it later
   */
  private static saveMacOSProxyState(networkService: string): void {
    try {
      const webProxyInfo = execSync(
        `networksetup -getwebproxy "${networkService}"`,
        { encoding: 'utf-8' },
      );
      const secureWebProxyInfo = execSync(
        `networksetup -getsecurewebproxy "${networkService}"`,
        { encoding: 'utf-8' },
      );

      const parseProxyInfo = (info: string) => {
        const enabled = info.includes('Enabled: Yes');
        const serverMatch = info.match(/Server: (.+)/);
        const portMatch = info.match(/Port: (\d+)/);
        return {
          enabled,
          server: serverMatch ? serverMatch[1].trim() : undefined,
          port: portMatch ? parseInt(portMatch[1], 10) : undefined,
        };
      };

      const webProxy = parseProxyInfo(webProxyInfo);
      const secureWebProxy = parseProxyInfo(secureWebProxyInfo);

      this.originalMacOSProxyState = {
        webProxyEnabled: webProxy.enabled,
        secureWebProxyEnabled: secureWebProxy.enabled,
        webProxyServer: webProxy.server,
        webProxyPort: webProxy.port,
        secureWebProxyServer: secureWebProxy.server,
        secureWebProxyPort: secureWebProxy.port,
      };

      logger.debug('Saved macOS proxy state:', this.originalMacOSProxyState);
    } catch (error) {
      logger.warn('Failed to save macOS proxy state:', error);
    }
  }

  /**
   * Configure macOS system proxy (used by iOS Simulator)
   */
  private static async configureIOSProxy(
    host: string,
    port: number,
  ): Promise<void> {
    const networkService = this.getMacOSNetworkService();
    logger.info(
      `Configuring macOS proxy on ${networkService}: ${host}:${port}`,
    );

    // Save current state before modifying
    this.saveMacOSProxyState(networkService);

    try {
      // Set HTTP proxy
      execSync(
        `networksetup -setwebproxy "${networkService}" ${host} ${port}`,
        { stdio: 'pipe' },
      );
      execSync(`networksetup -setwebproxystate "${networkService}" on`, {
        stdio: 'pipe',
      });

      // Set HTTPS proxy
      execSync(
        `networksetup -setsecurewebproxy "${networkService}" ${host} ${port}`,
        { stdio: 'pipe' },
      );
      execSync(`networksetup -setsecurewebproxystate "${networkService}" on`, {
        stdio: 'pipe',
      });

      // Set bypass domains to avoid proxying local traffic
      execSync(
        `networksetup -setproxybypassdomains "${networkService}" "localhost" "127.0.0.1" "*.local"`,
        { stdio: 'pipe' },
      );

      logger.info('macOS proxy configured successfully');
    } catch (error) {
      logger.error('Failed to configure macOS proxy:', error);
      throw error;
    }
  }

  /**
   * Restore macOS proxy to original state
   */
  private static async restoreIOSProxy(): Promise<void> {
    const networkService = this.getMacOSNetworkService();
    logger.info(`Restoring macOS proxy on ${networkService}`);

    try {
      if (this.originalMacOSProxyState) {
        // Restore HTTP proxy
        if (
          this.originalMacOSProxyState.webProxyEnabled &&
          this.originalMacOSProxyState.webProxyServer &&
          this.originalMacOSProxyState.webProxyPort
        ) {
          execSync(
            `networksetup -setwebproxy "${networkService}" ${this.originalMacOSProxyState.webProxyServer} ${this.originalMacOSProxyState.webProxyPort}`,
            { stdio: 'pipe' },
          );
          execSync(`networksetup -setwebproxystate "${networkService}" on`, {
            stdio: 'pipe',
          });
        } else {
          execSync(`networksetup -setwebproxystate "${networkService}" off`, {
            stdio: 'pipe',
          });
        }

        // Restore HTTPS proxy
        if (
          this.originalMacOSProxyState.secureWebProxyEnabled &&
          this.originalMacOSProxyState.secureWebProxyServer &&
          this.originalMacOSProxyState.secureWebProxyPort
        ) {
          execSync(
            `networksetup -setsecurewebproxy "${networkService}" ${this.originalMacOSProxyState.secureWebProxyServer} ${this.originalMacOSProxyState.secureWebProxyPort}`,
            { stdio: 'pipe' },
          );
          execSync(
            `networksetup -setsecurewebproxystate "${networkService}" on`,
            { stdio: 'pipe' },
          );
        } else {
          execSync(
            `networksetup -setsecurewebproxystate "${networkService}" off`,
            { stdio: 'pipe' },
          );
        }
      } else {
        // Just disable proxies if we don't have original state
        execSync(`networksetup -setwebproxystate "${networkService}" off`, {
          stdio: 'pipe',
        });
        execSync(
          `networksetup -setsecurewebproxystate "${networkService}" off`,
          { stdio: 'pipe' },
        );
      }

      this.originalMacOSProxyState = null;
      logger.info('macOS proxy restored successfully');
    } catch (error) {
      logger.error('Failed to restore macOS proxy:', error);
    }
  }

  /**
   * Configure Android emulator global HTTP proxy
   * Note: For Android emulator, 10.0.2.2 refers to the host machine
   */
  private static async configureAndroidProxy(
    _host: string,
    port: number,
  ): Promise<void> {
    // Android emulator uses 10.0.2.2 to refer to host machine
    const androidHost = '10.0.2.2';
    logger.info(`Configuring Android proxy: ${androidHost}:${port}`);

    try {
      execSync(
        `adb shell settings put global http_proxy ${androidHost}:${port}`,
        {
          stdio: 'pipe',
        },
      );

      this.androidProxyConfigured = true;
      logger.info('Android proxy configured successfully');
    } catch (error) {
      logger.error('Failed to configure Android proxy:', error);
      throw error;
    }
  }

  /**
   * Remove Android emulator global HTTP proxy
   */
  private static async restoreAndroidProxy(): Promise<void> {
    if (!this.androidProxyConfigured) {
      return;
    }

    logger.info('Removing Android proxy');

    try {
      // Remove the proxy by setting it to :0
      execSync('adb shell settings put global http_proxy :0', {
        stdio: 'pipe',
      });

      this.androidProxyConfigured = false;
      logger.info('Android proxy removed successfully');
    } catch (error) {
      logger.error('Failed to remove Android proxy:', error);
    }
  }

  /**
   * Configure system-level HTTP proxy for the current platform.
   * This makes WebView network traffic go through the mock server.
   *
   * @param port - The mock server port to proxy through
   * @param host - The host address (default: 127.0.0.1 for localhost)
   */
  static async configureSystemProxy(
    port: number,
    host: string = '127.0.0.1',
  ): Promise<void> {
    logger.info(`Configuring system proxy on port ${port}`);

    const isIOS = await PlatformDetector.isIOS();

    if (isIOS) {
      await this.configureIOSProxy(host, port);
    } else {
      await this.configureAndroidProxy(host, port);
    }
  }

  /**
   * Restore system proxy to original state (or disable if no original state).
   * Should be called in test cleanup.
   */
  static async restoreSystemProxy(): Promise<void> {
    logger.info('Restoring system proxy');

    const isIOS = await PlatformDetector.isIOS();

    if (isIOS) {
      await this.restoreIOSProxy();
    } else {
      await this.restoreAndroidProxy();
    }
  }

  /**
   * Check if system proxy is currently configured
   */
  static isProxyConfigured(): boolean {
    return this.originalMacOSProxyState !== null || this.androidProxyConfigured;
  }
}

export default SystemProxyUtils;
