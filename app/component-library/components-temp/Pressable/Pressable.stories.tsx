import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { lightTheme, darkTheme, brandColor } from '@metamask/design-tokens';
import {
  ThemeProvider as DesignSystemThemeProvider,
  Theme as DesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

import { ThemeContext, useTheme } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';

import Pressable from './Pressable';

const layout = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 20 },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

const PressableMeta = {
  title: 'Components Temp / Pressable',
  component: Pressable,
};

export default PressableMeta;

/**
 * Story-only wrapper that drives the design-system theme from the OS
 * color scheme (`useColorScheme()`) instead of the app's Redux theme
 * state. This lets the story respond to the device's dark/light setting
 * directly — flip OS dark mode and the story re-renders accordingly.
 */
const OSThemePane = ({ children }: { children: React.ReactNode }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const source = isDark ? darkTheme : lightTheme;
  const theme = {
    ...source,
    themeAppearance: isDark ? AppThemeKey.dark : AppThemeKey.light,
    brandColors: brandColor,
  };

  return (
    <ThemeContext.Provider value={theme}>
      <DesignSystemThemeProvider
        theme={isDark ? DesignSystemTheme.Dark : DesignSystemTheme.Light}
      >
        <View
          style={[
            layout.page,
            { backgroundColor: theme.colors.background.alternative },
          ]}
        >
          {children}
        </View>
      </DesignSystemThemeProvider>
    </ThemeContext.Provider>
  );
};

const SurfaceLabel = ({ children }: { children: React.ReactNode }) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextMuted}
  >
    {children}
  </Text>
);

const PressMe = () => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextDefault}
  >
    Press me
  </Text>
);

const PressableCard = ({
  surfaceColor,
  disableFeedback,
}: {
  surfaceColor: string;
  disableFeedback?: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => undefined}
      disableFeedback={disableFeedback}
      style={[
        layout.card,
        {
          backgroundColor: surfaceColor,
          borderColor: colors.border.muted,
        },
      ]}
    >
      <PressMe />
    </Pressable>
  );
};

const SurfaceCatalog = () => {
  const { colors } = useTheme();
  const surfaces = [
    { key: 'default', color: colors.background.default },
    { key: 'section', color: colors.background.section },
    { key: 'subsection', color: colors.background.subsection },
    { key: 'muted', color: colors.background.muted },
  ];
  return (
    <Box twClassName="gap-3">
      {surfaces.map((s) => (
        <Box key={s.key} twClassName="gap-1">
          <SurfaceLabel>background.{s.key}</SurfaceLabel>
          <PressableCard surfaceColor={s.color} />
        </Box>
      ))}
    </Box>
  );
};

export const Default = {
  render: () => (
    <OSThemePane>
      <SurfaceCatalog />
    </OSThemePane>
  ),
};

export const FeedbackOnVsOff = {
  render: () => {
    const FeedbackPair = () => {
      const { colors } = useTheme();
      return (
        <Box twClassName="gap-3">
          <Box twClassName="gap-1">
            <SurfaceLabel>Default — shows overlay on press</SurfaceLabel>
            <PressableCard surfaceColor={colors.background.default} />
          </Box>
          <Box twClassName="gap-1">
            <SurfaceLabel>disableFeedback — no visual change</SurfaceLabel>
            <PressableCard
              surfaceColor={colors.background.default}
              disableFeedback
            />
          </Box>
        </Box>
      );
    };
    return (
      <OSThemePane>
        <FeedbackPair />
      </OSThemePane>
    );
  },
};
