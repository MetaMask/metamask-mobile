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
  HeaderSearchInlineProps,
  HeaderSearchProps,
  HeaderSearchScreenProps,
  HeaderSearchVariant,
} from './HeaderSearch.types';

/**
 * HeaderSearch is a header component that combines a search field
 * with either a back button (screen variant) or cancel button (inline variant).
 *
 * @example
 * // Screen variant with back button
 * <HeaderSearch
 *   variant={HeaderSearchVariant.Screen}
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
 * <HeaderSearch
 *   variant={HeaderSearchVariant.Inline}
 *   onPressCancelButton={handleCancel}
 *   textFieldSearchProps={{
 *     value: searchText,
 *     onChangeText: setSearchText,
 *     onPressClearButton: () => setSearchText(''),
 *     placeholder: 'Search...',
 *   }}
 * />
 */
const HeaderSearch: React.FC<HeaderSearchProps> = (props) => {
  const {
    variant,
    textFieldSearchProps,
    twClassName = '',
    ...boxProps
  } = props;

  const baseTwClassName = 'h-14 flex-row items-center';

  if (variant === HeaderSearchVariant.Screen) {
    const { onPressBackButton, backButtonProps } =
      props as HeaderSearchScreenProps;
    const screenBoxProps = boxProps as Omit<
      HeaderSearchScreenProps,
      | 'variant'
      | 'textFieldSearchProps'
      | 'twClassName'
      | 'onPressBackButton'
      | 'backButtonProps'
      | 'onPressCancelButton'
      | 'cancelButtonProps'
    >;

    return (
      <Box
        {...screenBoxProps}
        twClassName={`${baseTwClassName} ml-1 mr-4 gap-2 ${twClassName}`.trim()}
      >
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
    props as HeaderSearchInlineProps;
  const inlineBoxProps = boxProps as Omit<
    HeaderSearchInlineProps,
    | 'variant'
    | 'textFieldSearchProps'
    | 'twClassName'
    | 'onPressCancelButton'
    | 'cancelButtonProps'
    | 'onPressBackButton'
    | 'backButtonProps'
  >;

  return (
    <Box
      {...inlineBoxProps}
      twClassName={`${baseTwClassName} ml-4 ${twClassName}`.trim()}
    >
      <Box twClassName="flex-1">
        <TextFieldSearch {...(textFieldSearchProps as TextFieldSearchProps)} />
      </Box>
      <Button
        variant={ButtonVariant.Tertiary}
        onPress={onPressCancelButton}
        textProps={{
          twClassName:
            `text-default ${cancelButtonProps?.textProps?.twClassName}`.trim(),
        }}
        {...cancelButtonProps}
      >
        {strings('browser.cancel')}
      </Button>
    </Box>
  );
};

export default HeaderSearch;
