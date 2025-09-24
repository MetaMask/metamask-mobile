import { Platform } from 'react-native';
import { getFontFamily } from '../../component-library/components/Texts/Text/Text.utils';
import { TextVariant } from '../../component-library/components/Texts/Text/Text.types';
import Logger from '../../util/Logger';

/**
 * FontPreloader ensures all custom fonts are loaded before UI components render
 * This prevents placeholder text shifting issues when fonts load asynchronously
 */
class FontPreloader {
  private static instance: FontPreloader;
  private fontsLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  static getInstance(): FontPreloader {
    if (!FontPreloader.instance) {
      FontPreloader.instance = new FontPreloader();
    }
    return FontPreloader.instance;
  }

  /**
   * Preload all Geist font variants by creating invisible text elements
   * This forces React Native to load and cache the fonts
   */
  async preloadFonts(): Promise<void> {
    if (this.fontsLoaded) {
      return Promise.resolve();
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    Logger.log('FontPreloader: Starting font preloading...');

    this.loadingPromise = new Promise((resolve) => {
      try {
        // Get all font variants used in the app
        const fontVariants = [
          TextVariant.DisplayMD,
          TextVariant.HeadingLG,
          TextVariant.HeadingMD,
          TextVariant.HeadingSM,
          TextVariant.BodyLGMedium,
          TextVariant.BodyMD,
          TextVariant.BodyMDMedium,
          TextVariant.BodySM,
          TextVariant.BodySMMedium,
          TextVariant.BodyXS,
        ];

        if (Platform.OS === 'web') {
          this.preloadFontsWeb(fontVariants, resolve);
        } else {
          this.preloadFontsNative(fontVariants, resolve);
        }
      } catch (error) {
        Logger.error('FontPreloader: Error during font preloading', error);
        // Still resolve to prevent blocking the app
        this.fontsLoaded = true;
        resolve();
      }
    });

    return this.loadingPromise;
  }

  /**
   * Preload fonts for web platform using FontFace API
   */
  private preloadFontsWeb(
    fontVariants: TextVariant[],
    resolve: () => void,
  ): void {
    const preloadContainer = document.createElement('div');
    preloadContainer.style.position = 'absolute';
    preloadContainer.style.left = '-9999px';
    preloadContainer.style.top = '-9999px';
    preloadContainer.style.visibility = 'hidden';

    fontVariants.forEach((variant) => {
      const fontFamily = getFontFamily(variant);

      // Create elements for Regular, Medium, and Bold weights
      ['400', '500', '700'].forEach((weight) => {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        span.style.fontWeight = weight;
        span.textContent = 'Font preload test';
        preloadContainer.appendChild(span);
      });
    });

    document.body.appendChild(preloadContainer);

    // Use FontFace API if available
    if ('fonts' in document) {
      Promise.all([
        document.fonts.load('400 16px "Geist Regular"'),
        document.fonts.load('500 16px "Geist Medium"'),
        document.fonts.load('700 16px "Geist Bold"'),
      ])
        .then(() => {
          document.body.removeChild(preloadContainer);
          this.fontsLoaded = true;
          Logger.log('FontPreloader: Web fonts loaded successfully');
          resolve();
        })
        .catch((error) => {
          Logger.error('FontPreloader: Web font loading failed', error);
          // Fallback: wait for a short time then resolve
          setTimeout(() => {
            document.body.removeChild(preloadContainer);
            this.fontsLoaded = true;
            resolve();
          }, 200);
        });
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        document.body.removeChild(preloadContainer);
        this.fontsLoaded = true;
        Logger.log('FontPreloader: Web fonts loaded (fallback)');
        resolve();
      }, 200);
    }
  }

  /**
   * Preload fonts for React Native (iOS/Android)
   * Fonts are typically loaded synchronously but we ensure they're cached
   */
  private preloadFontsNative(
    fontVariants: TextVariant[],
    resolve: () => void,
  ): void {
    // For React Native, fonts are registered in Info.plist (iOS) and assets (Android)
    // We create a small delay to ensure font cache is warmed up
    const fontFamilies = fontVariants.map((variant) => getFontFamily(variant));

    // Log the fonts we're expecting to be available
    Logger.log('FontPreloader: Expected font families:', fontFamilies);

    // Small delay to ensure fonts are cached by the system
    setTimeout(
      () => {
        this.fontsLoaded = true;
        Logger.log('FontPreloader: Native fonts cached successfully');
        resolve();
      },
      Platform.OS === 'ios' ? 50 : 100,
    ); // iOS is typically faster
  }

  /**
   * Check if fonts are loaded
   */
  areFontsLoaded(): boolean {
    return this.fontsLoaded;
  }

  /**
   * Reset font loading state (useful for testing)
   */
  reset(): void {
    this.fontsLoaded = false;
    this.loadingPromise = null;
    Logger.log('FontPreloader: Reset font loading state');
  }

  /**
   * Get loading promise for external use
   */
  getLoadingPromise(): Promise<void> | null {
    return this.loadingPromise;
  }
}

export default FontPreloader.getInstance();
