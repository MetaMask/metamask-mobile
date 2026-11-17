import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
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

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  flex: {
    flex: 1,
  },
  border: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 4,
  },
});

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
  // Extract the muted border colour from the design token so we can apply it
  // to the absolutely-positioned border overlay without hardcoding a hex value.
  const { borderColor: mutedBorderColor } = StyleSheet.flatten(
    tw.style('border-muted'),
  ) as { borderColor: string };

  return (
    <Box style={styles.container}>
      {/* Content — always fully opaque */}
      <Box twClassName="rounded-[24px] bg-default p-5">
        <Box
          twClassName={`flex-row items-start gap-2 rounded-2xl ${cardBackgroundClass} px-3 py-3`}
        >
          <Box twClassName="h-9 w-9 shrink-0 self-start items-center justify-center rounded-xl bg-muted">
            <Image
              source={FoxImage}
              style={tw.style('h-6 w-6')}
              resizeMode="contain"
            />
          </Box>
          <Box twClassName="min-w-0 flex-1">
            <Box twClassName="mb-0.5 flex-row items-center justify-between">
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                twClassName="leading-[20px]"
              >
                {title}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                twClassName="ml-2 shrink-0 text-alternative"
              >
                {timestamp}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyXs}
              twClassName="text-alternative leading-[15.6px]"
            >
              {message}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Border overlay — MaskedView fades the border top-to-transparent */}
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={['black', 'black', 'transparent']}
            locations={[0, 0.2, 0.75]}
            style={styles.flex}
          />
        }
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.border,
            { borderColor: mutedBorderColor },
          ]}
        />
      </MaskedView>
    </Box>
  );
};

export default NotifCard;
