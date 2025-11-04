import { Platform } from 'react-native';
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
   * Preload all Geist font files by creating invisible text elements
   * This forces React Native to load and cache the fonts
   */
  preloadFonts(): Promise<void> {
    // If we have a loading promise (even if fonts are loaded), return it for consistency
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // If fonts are already loaded and no promise exists, return resolved promise
    if (this.fontsLoaded) {
      return Promise.resolve();
    }

    Logger.log('FontPreloader: Starting font preloading...');

    this.loadingPromise = new Promise((resolve) => {
      try {
        // All available font families
        const fontFamilies = [
          'Geist Regular',
          'Geist Medium',
          'Geist Bold',
          'Geist Regular Italic',
          'Geist Medium Italic',
          'Geist Bold Italic',
          'MM Poly Regular',
          'MM Sans Regular',
          'MM Sans Medium',
          'MM Sans Bold',
        ];

        if (Platform.OS === 'web') {
          this.preloadFontsWeb(fontFamilies, resolve);
        } else {
          this.preloadFontsNative(fontFamilies, resolve);
        }
      } catch (error) {
        Logger.error(
          new Error('FontPreloader: Error during font preloading'),
          error,
        );
        // Still resolve to prevent blocking the app
        this.fontsLoaded = true;
        resolve();
      }
    });

    return this.loadingPromise;
  }

  /**
   * Extract font weight and style from font family name
   */
  private extractFontProperties(fontFamily: string): {
    weight: string;
    style: string;
  } {
    const lowerFamily = fontFamily.toLowerCase();

    // Extract font weight
    let weight = '400'; // default to normal
    if (lowerFamily.includes('bold')) {
      weight = '700';
    } else if (lowerFamily.includes('medium')) {
      weight = '500';
    }

    // Extract font style
    const style = lowerFamily.includes('italic') ? 'italic' : 'normal';

    return { weight, style };
  }

  /**
   * Preload fonts for web platform using FontFace API
   */
  private preloadFontsWeb(fontFamilies: string[], resolve: () => void): void {
    const preloadContainer = document.createElement('div');
    preloadContainer.style.position = 'absolute';
    preloadContainer.style.left = '-9999px';
    preloadContainer.style.top = '-9999px';
    preloadContainer.style.visibility = 'hidden';

    fontFamilies.forEach((fontFamily) => {
      const span = document.createElement('span');
      const { weight, style } = this.extractFontProperties(fontFamily);

      span.style.fontFamily = fontFamily;
      span.style.fontWeight = weight;
      span.style.fontStyle = style;
      span.textContent = 'Font preload test';
      preloadContainer.appendChild(span);
    });

    document.body.appendChild(preloadContainer);

    // Use FontFace API if available
    if ('fonts' in document) {
      const fontLoadPromises = [
        document.fonts.load('400 16px "Geist Regular"'),
        document.fonts.load('500 16px "Geist Medium"'),
        document.fonts.load('700 16px "Geist Bold"'),
        document.fonts.load('italic 400 16px "Geist Regular Italic"'),
        document.fonts.load('italic 500 16px "Geist Medium Italic"'),
        document.fonts.load('italic 700 16px "Geist Bold Italic"'),
        document.fonts.load('400 16px "MM Poly Regular"'),
        document.fonts.load('400 16px "MM Sans Regular"'),
        document.fonts.load('500 16px "MM Sans Medium"'),
        document.fonts.load('700 16px "MM Sans Bold"'),
      ];

      Promise.all(fontLoadPromises)
        .then(() => {
          document.body.removeChild(preloadContainer);
          this.fontsLoaded = true;
          Logger.log('FontPreloader: Web fonts loaded successfully');
          resolve();
        })
        .catch((error) => {
          Logger.error(
            new Error('FontPreloader: Web font loading failed'),
            error,
          );
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
    fontFamilies: string[],
    resolve: () => void,
  ): void {
    // For React Native, fonts are registered in Info.plist (iOS) and assets (Android)
    // We create a small delay to ensure font cache is warmed up

    // Log the font families passed as a parameter (not derived from fontVariants.map())
    Logger.log(
      'FontPreloader: Preloading font families (parameter):',
      fontFamilies,
    );

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
