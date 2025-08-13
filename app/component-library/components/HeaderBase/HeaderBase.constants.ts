/* eslint-disable import/prefer-default-export */

// External dependencies.
import { TextVariant } from '../Texts/Text';

// Enums
export enum HeaderBaseAlign {
  Left = 'left',
  Center = 'center',
}

// Defaults
export const DEFAULT_HEADERBASE_TITLE_TEXTVARIANT = TextVariant.HeadingSM;
export const DEFAULT_HEADERBASE_ALIGN = HeaderBaseAlign.Center;

// Test IDs
export const HEADERBASE_TEST_ID = 'header';
export const HEADERBASE_TITLE_TEST_ID = 'header-title';
