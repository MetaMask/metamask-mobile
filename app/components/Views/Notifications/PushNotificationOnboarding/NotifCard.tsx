import React from 'react';
import { Image, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Theme,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import FoxImage from '../../../../images/branding/fox.png';

export interface NotifCardProps {
  timestamp?: string;
  title?: string;
  message?: string;
}

const NotifCard = ({
  timestamp = strings(
    'notifications.push_onboarding.new_user.preview_card_1.time',
  ),
  title = strings(
    'notifications.push_onboarding.new_user.preview_card_1.title',
  ),
  message = strings(
    'notifications.push_onboarding.new_user.preview_card_1.message',
  ),
}: NotifCardProps) => {
  const tw = useTailwind();
  const theme = useTheme();
  const cardBackgroundClass =
    theme === Theme.Light ? 'bg-section' : 'bg-subsection';

  return (
    // Gradient border: LinearGradient provides the border colour that fades to
    // transparent at the bottom; the inner View clips to the same radius.
    <LinearGradient
      colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={tw.style('rounded-2xl p-px')}
    >
      <View style={tw.style('rounded-2xl bg-default p-3')}>
        <Box
          twClassName={`flex-row items-start gap-3 rounded-[14px] border border-muted ${cardBackgroundClass} px-[14px] py-3`}
        >
          <Box twClassName="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
            <Image
              source={FoxImage}
              style={tw.style('h-[22px] w-[22px]')}
              resizeMode="contain"
            />
          </Box>
          <Box twClassName="min-w-0 flex-1">
            <Box twClassName="mb-0.5 flex-row justify-end">
              <Text variant={TextVariant.BodyXs} twClassName="text-alternative">
                {timestamp}
              </Text>
            </Box>
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
              {title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              twClassName="mt-0.5 text-default"
            >
              {message}
            </Text>
          </Box>
        </Box>
      </View>
    </LinearGradient>
  );
};

export default NotifCard;
