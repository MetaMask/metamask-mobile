/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { ButtonAnimated } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, { IconColor, IconSize } from '../../Icons/Icon';
import { default as MMText, TextColor, TextVariant } from '../../Texts/Text';

// Internal dependencies
import { TabBarItemProps } from './TabBarItem.types';
import TradeTabBarItem from '../TradeTabBarItem';

// Internal component that uses the locked theme for trade button
const TabBarItem = ({
  iconName,
  isActive = false,
  isTradeButton = false,
  label,
  ...props
}: TabBarItemProps) => {
  const tw = useTailwind(); // Gets theme from ThemeProvider context

  const iconColor = isActive ? IconColor.Default : IconColor.Alternative;

  return isTradeButton ? (
    <TradeTabBarItem
      testID={props.testID}
      label={label}
      accessibilityLabel={label}
      accessible
      accessibilityRole="button"
    />
  ) : (
    <ButtonAnimated
      style={tw.style(
        'items-center justify-center bg-transparent w-full px-2 py-1',
      )}
      testID={props.testID}
      accessibilityLabel={label}
      accessible
      accessibilityRole="button"
      {...props}
    >
      <Icon name={iconName} size={IconSize.Lg} color={iconColor} />
      {label && (
        <MMText
          variant={TextVariant.BodyXSMedium}
          color={isActive ? TextColor.Default : TextColor.Alternative}
          style={tw.style('mt-1 flex-shrink-0')}
          numberOfLines={1}
        >
          {label}
        </MMText>
      )}
    </ButtonAnimated>
  );
};

export default TabBarItem;
