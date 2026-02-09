// Third party dependencies.
import React from 'react';

// External dependencies.
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

// Internal dependencies.
import TextFieldSearch from '../../components/Form/TextFieldSearch';
import { TextFieldSearchProps } from '../../components/Form/TextFieldSearch/TextFieldSearch.types';
import {
  HeaderCompactSearchInlineProps,
  HeaderCompactSearchProps,
  HeaderCompactSearchScreenProps,
  HeaderCompactSearchVariant,
} from './HeaderCompactSearch.types';

/**
 * HeaderCompactSearch is a header component that combines a search field
 * with either a back button (screen variant) or cancel button (inline variant).
 *
 * @example
 * // Screen variant with back button
 * <HeaderCompactSearch
 *   variant={HeaderCompactSearchVariant.Screen}
 *   onPressBackButton={handleBack}
 *   textFieldSearchProps={{
 *     value: searchText,
 *     onChangeText: setSearchText,
 *     onPressClearButton: () => setSearchText(''),
 *     placeholder: 'Search...',
 *   }}
 * />
 *
 * @example
 * // Inline variant with cancel button
 * <HeaderCompactSearch
 *   variant={HeaderCompactSearchVariant.Inline}
 *   onPressCancelButton={handleCancel}
 *   textFieldSearchProps={{
 *     value: searchText,
 *     onChangeText: setSearchText,
 *     onPressClearButton: () => setSearchText(''),
 *     placeholder: 'Search...',
 *   }}
 * />
 */
const HeaderCompactSearch: React.FC<HeaderCompactSearchProps> = (props) => {
  const { variant, textFieldSearchProps, twClassName, ...boxProps } = props;

  const baseTwClassName = 'h-14 flex-row items-center';

  if (variant === HeaderCompactSearchVariant.Screen) {
    const { onPressBackButton, backButtonProps } =
      props as HeaderCompactSearchScreenProps;
    const screenBoxProps = boxProps as Omit<
      HeaderCompactSearchScreenProps,
      | 'variant'
      | 'textFieldSearchProps'
      | 'twClassName'
      | 'onPressBackButton'
      | 'backButtonProps'
      | 'onPressCancelButton'
      | 'cancelButtonProps'
    >;
    const screenTwClassName = twClassName
      ? `${baseTwClassName} ml-1 mr-4 gap-2 ${twClassName}`
      : `${baseTwClassName} ml-1 mr-4 gap-2`;

    return (
      <Box twClassName={screenTwClassName} {...screenBoxProps}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onPressBackButton}
          {...backButtonProps}
        />
        <Box twClassName="flex-1">
          <TextFieldSearch
            {...(textFieldSearchProps as TextFieldSearchProps)}
          />
        </Box>
      </Box>
    );
  }

  // Inline variant
  const { onPressCancelButton, cancelButtonProps } =
    props as HeaderCompactSearchInlineProps;
  const inlineBoxProps = boxProps as Omit<
    HeaderCompactSearchInlineProps,
    | 'variant'
    | 'textFieldSearchProps'
    | 'twClassName'
    | 'onPressCancelButton'
    | 'cancelButtonProps'
    | 'onPressBackButton'
    | 'backButtonProps'
  >;
  const inlineTwClassName = twClassName
    ? `${baseTwClassName} ml-4 ${twClassName}`
    : `${baseTwClassName} ml-4`;

  return (
    <Box twClassName={inlineTwClassName} {...inlineBoxProps}>
      <Box twClassName="flex-1">
        <TextFieldSearch {...(textFieldSearchProps as TextFieldSearchProps)} />
      </Box>
      <Button
        variant={ButtonVariant.Tertiary}
        onPress={onPressCancelButton}
        textProps={{ twClassName: 'text-default' }}
        {...cancelButtonProps}
      >
        {strings('browser.cancel')}
      </Button>
    </Box>
  );
};

export default HeaderCompactSearch;
