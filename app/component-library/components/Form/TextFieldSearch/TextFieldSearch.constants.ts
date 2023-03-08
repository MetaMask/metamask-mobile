/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
// External dependencies.
import { IconName, IconSize } from '../../Icons/Icon';
import { ButtonIconSizes } from '../../Buttons/ButtonIcon';

// Internal dependencies.
import { TextFieldSearchProps } from './TextFieldSearch.types';

// Tokens
export const TOKEN_TEXTFIELDSEARCH_SEARCHICON_NAME = IconName.Search;
export const TOKEN_TEXTFIELDSEARCH_SEARCHICON_SIZE = IconSize.Sm;
export const TOKEN_TEXTFIELDSEARCH_CLOSEICON_NAME = IconName.Close;
export const TOKEN_TEXTFIELDSEARCH_CLOSEICON_SIZE = ButtonIconSizes.Sm;

// Test IDs
export const TEXTFIELDSEARCH_TEST_ID = 'textfieldsearch';

// Sample consts
export const SAMPLE_TEXTFIELDSEARCH_PROPS: TextFieldSearchProps = {
  showClearButton: false,
  clearButtonOnPress: () => {
    console.log('clicked');
  },
};
