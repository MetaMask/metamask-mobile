import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  Box,
  Button,
  ButtonIconSize,
  ButtonVariant,
  HeaderSearch,
  HeaderSearchVariant,
  IconName,
  TextFieldSearch,
  type HeaderSearchInlineProps,
  type HeaderSearchProps,
  type HeaderSearchScreenProps,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import ButtonIconGlass from '../ButtonIconGlass';
import CapsuleGlass from '../CapsuleGlass';
import HeaderGlass, { type HeaderGlassOptions } from '../HeaderGlass';

export type HeaderSearchGlassProps = HeaderSearchProps &
  HeaderGlassOptions & {
    /** The content's scroll offset; fades the `animated` backdrop in. */
    scrollY?: SharedValue<number>;
  };

const BASE_CLASS = 'h-14 flex-row items-center';

const withClass = (base: string, twClassName?: string) =>
  twClassName ? `${base} ${twClassName}` : base;

const SearchFieldGlass = ({
  textFieldSearchProps,
}: Pick<HeaderSearchProps, 'textFieldSearchProps'>) => (
  <Box twClassName="flex-1">
    <CapsuleGlass twClassName="h-12">
      <TextFieldSearch
        {...textFieldSearchProps}
        // The capsule draws the fill and the outline.
        twClassName={withClass(
          'h-12 flex-1 border-0 bg-transparent',
          textFieldSearchProps.twClassName,
        )}
      />
    </CapsuleGlass>
  </Box>
);

const ScreenRowGlass = ({
  variant: _variant,
  textFieldSearchProps,
  twClassName,
  onPressBackButton,
  backButtonProps,
  ...boxProps
}: HeaderSearchScreenProps) => (
  <Box
    {...boxProps}
    twClassName={withClass(`${BASE_CLASS} ml-1 mr-4 gap-2`, twClassName)}
  >
    <ButtonIconGlass
      isCapsule
      size={ButtonIconSize.Md}
      {...backButtonProps}
      iconName={IconName.ArrowLeft}
      onPress={onPressBackButton}
    />
    <SearchFieldGlass textFieldSearchProps={textFieldSearchProps} />
  </Box>
);

const InlineRowGlass = ({
  variant: _variant,
  textFieldSearchProps,
  twClassName,
  onPressCancelButton,
  cancelButtonProps,
  ...boxProps
}: HeaderSearchInlineProps) => (
  <Box
    {...boxProps}
    twClassName={withClass(`${BASE_CLASS} mx-4 gap-2`, twClassName)}
  >
    <SearchFieldGlass textFieldSearchProps={textFieldSearchProps} />
    <CapsuleGlass twClassName="h-12">
      <Button
        {...cancelButtonProps}
        variant={ButtonVariant.Tertiary}
        onPress={onPressCancelButton}
        textProps={{
          ...cancelButtonProps?.textProps,
          twClassName: withClass(
            'text-default',
            cancelButtonProps?.textProps?.twClassName,
          ),
        }}
      >
        {strings('browser.cancel')}
      </Button>
    </CapsuleGlass>
  </Box>
);

/**
 * MMDS `HeaderSearch` with its search field, back and cancel buttons in glass
 * capsules. MMDS exposes no slots, so the glass row rebuilds its layout.
 * Pass `isFloating={false}` to keep the header in flow, as `HeaderSearch` is.
 */
const HeaderSearchGlass = ({
  isGlass = true,
  backdrop,
  fadeInDistance,
  isFloating,
  scrollY,
  ...props
}: HeaderSearchGlassProps) => {
  if (!isGlass) {
    return <HeaderSearch {...props} />;
  }

  const { onLayout, ...rowProps } = props;

  return (
    <HeaderGlass
      onLayout={onLayout}
      backdrop={backdrop}
      scrollDistance={scrollY}
      fadeInDistance={fadeInDistance}
      isFloating={isFloating}
    >
      {rowProps.variant === HeaderSearchVariant.Screen ? (
        <ScreenRowGlass {...rowProps} />
      ) : (
        <InlineRowGlass {...rowProps} />
      )}
    </HeaderGlass>
  );
};

HeaderSearchGlass.displayName = 'HeaderSearchGlass';

export default HeaderSearchGlass;
