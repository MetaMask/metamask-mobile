/* eslint-disable import/no-commonjs */
/**
 * Tailwind CSS Configuration for MetaMask Mobile
 *
 * This configuration file serves two primary purposes:
 * 1. Enable Tailwind CSS IntelliSense in VSCode for better developer experience
 * 2. Power the Tailwind CSS ESLint plugin to enforce consistent styling practices
 *
 * IMPORTANT: This file is for tooling only. The actual Tailwind classes and design tokens
 * are defined in the @metamask/design-system-twrnc-preset package, which is consumed by
 * the React Native app at runtime.
 *
 * To add or modify design tokens and classes:
 * - Update the @metamask/design-system-twrnc-preset package
 * - Repository: https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-twrnc-preset
 * - Or reach out to the Design System team for guidance
 *
 * @see https://github.com/MetaMask/metamask-design-system
 */

const {
  generateTailwindConfig,
  Theme,
} = require('@metamask/design-system-twrnc-preset/tailwind.config');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './app/component-library/**/*.{js,jsx,ts,tsx}',
    './app/components/**/*.{js,jsx,ts,tsx}',
  ],
  // If you prefer dark theme color indicators with Tailwind Intellisense
  // Change Theme.Light to Theme.Dark
  ...generateTailwindConfig(Theme.Light),
};
