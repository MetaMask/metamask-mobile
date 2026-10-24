import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Text,
} from '@metamask/design-system-react-native';
import { renderUnstakingTimeRemaining } from './utils';

export type UnstakingBannerProps = {
  style?: StyleProp<ViewStyle>;
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  amountEth: string;
};

const UnstakingBanner = ({
  timeRemaining,
  amountEth,
  style,
}: UnstakingBannerProps) => (
  <View style={style}>
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      description={
        <Text testID="unstaking-banner">
          {renderUnstakingTimeRemaining(timeRemaining, amountEth)}
        </Text>
      }
    />
  </View>
);

export default UnstakingBanner;
