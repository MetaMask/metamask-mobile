/**
 * Utility functions for transforming SVG content to be compatible with React Native SVG
 */

/**
 * Transforms SVG content to be compatible with React Native SVG rendering
 * @param svgText - Raw SVG string content
 * @returns Transformed SVG string that works with React Native
 */
export function transformSvgForReactNative(svgText: string): string {
  let cleanedSvg = svgText;

  // Convert display-p3 colors to standard RGB
  if (cleanedSvg.includes('display-p3')) {
    cleanedSvg = cleanedSvg.replace(
      /color\(display-p3\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g,
      (_match, r, g, b) => {
        // Convert from 0-1 range to 0-255 range
        const red = Math.round(parseFloat(r) * 255);
        const green = Math.round(parseFloat(g) * 255);
        const blue = Math.round(parseFloat(b) * 255);
        return `rgb(${red}, ${green}, ${blue})`;
      },
    );
  }

  // Remove filter elements and references as they cause rendering issues
  if (cleanedSvg.includes('filter')) {
    // Remove filter definitions
    cleanedSvg = cleanedSvg.replace(/<filter[^>]*>[\s\S]*?<\/filter>/g, '');
    // Remove filter attributes
    cleanedSvg = cleanedSvg.replace(/filter="[^"]*"/g, '');
    // Remove filter style properties
    cleanedSvg = cleanedSvg.replace(/filter:[^;]+;?/g, '');
  }

  // Remove mask elements and references
  if (cleanedSvg.includes('mask')) {
    // Remove mask definitions
    cleanedSvg = cleanedSvg.replace(/<mask[^>]*>[\s\S]*?<\/mask>/g, '');
    // Remove mask attributes
    cleanedSvg = cleanedSvg.replace(/mask="[^"]*"/g, '');
    // Remove mask style properties
    cleanedSvg = cleanedSvg.replace(/mask:[^;]+;?/g, '');
  }

  // Fix SVGs with inline styles - React Native SVG doesn't handle CSS classes well
  if (cleanedSvg.includes('<style')) {
    const styleMatch = cleanedSvg.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (styleMatch) {
      const styles = styleMatch[1];

      // Extract and inline class definitions
      const classRegex = /\.([a-zA-Z0-9\-_]+)\s*\{([^}]+)\}/g;
      let classMatch;
      while ((classMatch = classRegex.exec(styles)) !== null) {
        const className = classMatch[1].trim();
        let classStyle = classMatch[2].trim();

        // Remove clip-path properties as React Native SVG doesn't support them well
        classStyle = classStyle.replace(/clip-path:[^;]+;?/g, '');

        // Escape special regex characters in className
        const escapedClassName = className.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        );

        // Only add style if there's something left after removing unsupported properties
        if (classStyle.trim()) {
          // Replace both class="className" and class='className'
          cleanedSvg = cleanedSvg.replace(
            new RegExp(`class=["']${escapedClassName}["']`, 'g'),
            `style="${classStyle}"`,
          );
        } else {
          // Remove the class attribute entirely if no styles remain
          cleanedSvg = cleanedSvg.replace(
            new RegExp(`class=["']${escapedClassName}["']`, 'g'),
            '',
          );
        }
      }

      // Remove the style tag
      cleanedSvg = cleanedSvg.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
    }
  }

  // Remove clipPath elements and references as they cause rendering issues
  if (cleanedSvg.includes('clipPath') || cleanedSvg.includes('clip-path')) {
    // Remove clipPath definitions
    cleanedSvg = cleanedSvg.replace(/<clipPath[^>]*>[\s\S]*?<\/clipPath>/g, '');
    // Remove defs that only contain clipPath
    cleanedSvg = cleanedSvg.replace(/<defs[^>]*>\s*<\/defs>/g, '');
    // Remove clip-path attributes
    cleanedSvg = cleanedSvg.replace(/clip-path="[^"]*"/g, '');
    // Remove clip-path style properties
    cleanedSvg = cleanedSvg.replace(/clip-path:[^;]+;?/g, '');
  }

  // Ensure viewBox is present if missing (for proper scaling)
  if (!cleanedSvg.includes('viewBox')) {
    const widthMatch = svgText.match(/width="([^"]*)"/);
    const heightMatch = svgText.match(/height="([^"]*)"/);
    if (widthMatch && heightMatch) {
      const width = parseFloat(widthMatch[1]);
      const height = parseFloat(heightMatch[1]);
      cleanedSvg = cleanedSvg.replace(
        '<svg',
        `<svg viewBox="0 0 ${width} ${height}"`,
      );
    }
  }

  return cleanedSvg;
}

/**
 * Validates if the provided string is valid SVG content
 * @param svgText - String to validate
 * @returns true if valid SVG content
 */
export function isValidSvgContent(svgText: string): boolean {
  return svgText.includes('<svg') || svgText.includes('<?xml');
}
