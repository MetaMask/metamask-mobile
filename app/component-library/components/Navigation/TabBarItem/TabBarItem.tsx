/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { ButtonAnimated } from '@metamask/design-system-react-native';
import {
  useTailwind,
  ThemeProvider,
  Theme,
} from '@metamask/design-system-twrnc-preset';
import Icon, { IconColor, IconSize } from '../../Icons/Icon';
import { default as MMText, TextColor, TextVariant } from '../../Texts/Text';

// Internal dependencies
import { TabBarItemProps } from './TabBarItem.types';

// Internal component that uses the locked theme for trade button
const TabBarItemInner = ({
  iconName,
  isActive = false,
  isTradeButton = false,
  label,
  ...props
}: TabBarItemProps) => {
  const tw = useTailwind(); // Gets theme from ThemeProvider context

  const getIconColor = () => {
    if (isTradeButton) {
      // Force light theme icon color for trade button (white on primary background)
      return tw.color('text-primary-inverse');
    }
    return isActive ? IconColor.Default : IconColor.Alternative;
  };

  return isTradeButton ? (
    <ButtonAnimated
      style={({ pressed }) =>
        tw.style(
          'h-[45px] w-[45px] items-center justify-center rounded-full bg-primary-default px-1 py-1',
          pressed && 'bg-primary-default-pressed',
        )
      }
      testID={props.testID}
      accessibilityLabel={label}
      accessible
      accessibilityRole="button"
      {...props}
    >
      <Icon name={iconName} size={IconSize.Md} color={getIconColor()} />
    </ButtonAnimated>
  ) : (
    <ButtonAnimated
      style={tw.style('items-center justify-center bg-transparent px-2 py-1')}
      testID={props.testID}
      accessibilityLabel={label}
      accessible
      accessibilityRole="button"
      {...props}
    >
      <Icon name={iconName} size={IconSize.Lg} color={getIconColor()} />
      {!isTradeButton && label && (
        <MMText
          variant={TextVariant.BodyXSMedium}
          color={isActive ? TextColor.Default : TextColor.Alternative}
          style={tw.style('mt-1')}
          numberOfLines={1}
        >
          {label}
        </MMText>
      )}
    </ButtonAnimated>
  );
};

/*
 * Lock TradeButton to light theme
 * The useTailwind hook needs to be called inside the ThemeProvider context to get the locked theme.
 * By splitting into two components, we ensure the hook gets the correct theme context for all color calculations.
 */
const TabBarItem = (props: TabBarItemProps) => {
  if (props.isTradeButton) {
    return (
      <ThemeProvider theme={Theme.Light}>
        <TabBarItemInner {...props} />
      </ThemeProvider>
    );
  }

  return <TabBarItemInner {...props} />;
};

export default TabBarItem;
