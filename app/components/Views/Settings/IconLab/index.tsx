/**
 * ICON LAB — temporary scratch screen.
 *
 * One page listing every design-system component that renders an icon, plus a
 * switcher that repoints the icon set for all of them at once. The switch is
 * global (see IconSetOverride), so navigating away shows the chosen set across
 * the rest of the app too; leaving this screen restores the DS icons.
 *
 * Remove this directory, the two icon deps, and the metro.config.js blockList
 * entry when the experiment is done.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  ActionListItem,
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BadgeIcon,
  BannerAlert,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  MainActionButton,
  SegmentedControl,
  SelectButton,
  Tag,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { IconWeight } from 'phosphor-react-native';

import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import {
  ALL_DS_ICON_NAMES,
  applyIconSet,
  coverageFor,
  LUCIDE_STROKE_WIDTHS,
  MATERIAL_STYLES,
  restoreIconSet,
  type IconSetName,
  type MaterialStyle,
} from './IconSetOverride';

const ICON_SETS: readonly { value: IconSetName; label: string }[] = [
  { value: 'design-system', label: 'DS' },
  { value: 'material', label: 'Material' },
  { value: 'phosphor', label: 'Phosphor' },
  { value: 'lucide', label: 'Lucide' },
];

const PHOSPHOR_WEIGHTS: readonly IconWeight[] = [
  'thin',
  'light',
  'regular',
  'bold',
  'fill',
  'duotone',
];

/** A representative spread, so the component list exercises varied glyphs. */
const SAMPLE_ICONS: readonly IconName[] = [
  IconName.Wallet,
  IconName.Notification,
  IconName.Setting,
  IconName.Security,
  IconName.SwapHorizontal,
  IconName.Send,
  IconName.Clock,
  IconName.Campaign,
  IconName.Code,
  IconName.Flash,
  IconName.Star,
  IconName.Lock,
];

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16 },
});

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Box twClassName="mb-6">
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Bold}
      twClassName="text-alternative mb-2"
    >
      {title.toUpperCase()}
    </Text>
    {children}
  </Box>
);

const IconLab = () => {
  const navigation = useNavigation();
  const [iconSet, setIconSet] = useState<IconSetName>('design-system');
  const [weight, setWeight] = useState<IconWeight>('regular');
  const [materialStyle, setMaterialStyle] = useState<MaterialStyle>('outlined');
  const [materialFilled, setMaterialFilled] = useState(false);
  const [lucideStroke, setLucideStroke] = useState(2);
  const [lucideAbsolute, setLucideAbsolute] = useState(false);
  // Mutating the asset map does not notify React; bumping this key remounts the
  // subtree so the change is visible immediately.
  const [renderKey, setRenderKey] = useState(0);

  const apply = useCallback(
    (
      set: IconSetName,
      phosphorWeight: IconWeight,
      style: MaterialStyle,
      filled: boolean,
      strokeWidth: number,
      absoluteStrokeWidth: boolean,
    ) => {
      applyIconSet(
        set,
        phosphorWeight,
        { style, filled },
        { strokeWidth, absoluteStrokeWidth },
      );
      setRenderKey((k) => k + 1);
    },
    [],
  );

  // Restore the DS icons when leaving, so the override never outlives the lab.
  useEffect(
    () => () => {
      restoreIconSet();
    },
    [],
  );

  const covered = coverageFor(iconSet);
  const coveredCount = ALL_DS_ICON_NAMES.filter((n) => covered.has(n)).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <HeaderCompactStandard onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          Icon Lab
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-alternative mb-4">
          {`${coveredCount} of ${ALL_DS_ICON_NAMES.length} DS icons backed by this set — the rest fall back to DS.`}
        </Text>

        <Box twClassName="mb-2">
          <SegmentedControl
            value={iconSet}
            onChange={(value) => {
              const next = value as IconSetName;
              setIconSet(next);
              apply(
                next,
                weight,
                materialStyle,
                materialFilled,
                lucideStroke,
                lucideAbsolute,
              );
            }}
            isFullWidth
            testID="icon-lab-set-switcher"
          >
            {ICON_SETS.map((s) => (
              <FilterButton
                key={s.value}
                value={s.value}
                testID={`icon-lab-set-${s.value}`}
              >
                {s.label}
              </FilterButton>
            ))}
          </SegmentedControl>
        </Box>

        {iconSet === 'material' && (
          <>
            <Box twClassName="mb-2">
              <SegmentedControl
                value={materialStyle}
                onChange={(value) => {
                  const next = value as MaterialStyle;
                  setMaterialStyle(next);
                  apply(
                    iconSet,
                    weight,
                    next,
                    materialFilled,
                    lucideStroke,
                    lucideAbsolute,
                  );
                }}
                isFullWidth
                testID="icon-lab-material-style"
              >
                {MATERIAL_STYLES.map((style) => (
                  <FilterButton
                    key={style}
                    value={style}
                    testID={`icon-lab-material-style-${style}`}
                  >
                    {style}
                  </FilterButton>
                ))}
              </SegmentedControl>
            </Box>
            <Box twClassName="mb-4">
              <SegmentedControl
                value={materialFilled ? 'fill' : 'regular'}
                onChange={(value) => {
                  const next = value === 'fill';
                  setMaterialFilled(next);
                  apply(
                    iconSet,
                    weight,
                    materialStyle,
                    next,
                    lucideStroke,
                    lucideAbsolute,
                  );
                }}
                isFullWidth
                testID="icon-lab-material-fill"
              >
                <FilterButton value="regular" testID="icon-lab-material-fill-0">
                  regular
                </FilterButton>
                <FilterButton value="fill" testID="icon-lab-material-fill-1">
                  fill
                </FilterButton>
              </SegmentedControl>
            </Box>
          </>
        )}

        {iconSet === 'lucide' && (
          <>
            <Box twClassName="mb-2">
              <SegmentedControl
                value={String(lucideStroke)}
                onChange={(value) => {
                  const next = Number(value);
                  setLucideStroke(next);
                  apply(
                    iconSet,
                    weight,
                    materialStyle,
                    materialFilled,
                    next,
                    lucideAbsolute,
                  );
                }}
                isFullWidth
                testID="icon-lab-lucide-stroke"
              >
                {LUCIDE_STROKE_WIDTHS.map((sw) => (
                  <FilterButton
                    key={sw}
                    value={String(sw)}
                    testID={`icon-lab-lucide-stroke-${sw}`}
                  >
                    {String(sw)}
                  </FilterButton>
                ))}
              </SegmentedControl>
            </Box>
            <Box twClassName="mb-4">
              <SegmentedControl
                value={lucideAbsolute ? 'absolute' : 'scaled'}
                onChange={(value) => {
                  const next = value === 'absolute';
                  setLucideAbsolute(next);
                  apply(
                    iconSet,
                    weight,
                    materialStyle,
                    materialFilled,
                    lucideStroke,
                    next,
                  );
                }}
                isFullWidth
                testID="icon-lab-lucide-absolute"
              >
                <FilterButton value="scaled" testID="icon-lab-lucide-scaled">
                  scaled stroke
                </FilterButton>
                <FilterButton value="absolute" testID="icon-lab-lucide-abs">
                  absolute stroke
                </FilterButton>
              </SegmentedControl>
            </Box>
          </>
        )}

        {iconSet === 'phosphor' && (
          <Box twClassName="mb-4">
            <SegmentedControl
              value={weight}
              onChange={(value) => {
                const next = value as IconWeight;
                setWeight(next);
                apply(
                  iconSet,
                  next,
                  materialStyle,
                  materialFilled,
                  lucideStroke,
                  lucideAbsolute,
                );
              }}
              isFullWidth
              testID="icon-lab-weight-switcher"
            >
              {PHOSPHOR_WEIGHTS.map((w) => (
                <FilterButton key={w} value={w} testID={`icon-lab-weight-${w}`}>
                  {w}
                </FilterButton>
              ))}
            </SegmentedControl>
          </Box>
        )}

        <Box key={renderKey}>
          <Section title="Icon — every size">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              {[
                IconSize.Xs,
                IconSize.Sm,
                IconSize.Md,
                IconSize.Lg,
                IconSize.Xl,
              ].map((size) => (
                <Icon
                  key={String(size)}
                  name={IconName.Wallet}
                  size={size}
                  color={IconColor.IconDefault}
                />
              ))}
            </Box>
          </Section>

          <Section title="Icon — every semantic colour">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-wrap"
            >
              {[
                IconColor.IconDefault,
                IconColor.IconAlternative,
                IconColor.IconMuted,
                IconColor.PrimaryDefault,
                IconColor.ErrorDefault,
                IconColor.SuccessDefault,
                IconColor.WarningDefault,
              ].map((color) => (
                <Icon
                  key={String(color)}
                  name={IconName.Notification}
                  size={IconSize.Lg}
                  color={color}
                />
              ))}
            </Box>
          </Section>

          <Section title="Icon — sample glyph spread">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-wrap"
            >
              {SAMPLE_ICONS.filter(Boolean).map((name) => (
                <Icon
                  key={name}
                  name={name}
                  size={IconSize.Lg}
                  color={
                    covered.has(name)
                      ? IconColor.IconDefault
                      : IconColor.IconMuted
                  }
                />
              ))}
            </Box>
            <Text
              variant={TextVariant.BodyXs}
              twClassName="text-alternative mt-1"
            >
              Muted glyphs are DS fallbacks with no equivalent in this set.
            </Text>
          </Section>

          <Section title="ButtonIcon">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              {[ButtonIconSize.Sm, ButtonIconSize.Md, ButtonIconSize.Lg].map(
                (size) => (
                  <ButtonIcon
                    key={String(size)}
                    iconName={IconName.Setting}
                    size={size}
                    onPress={() => undefined}
                  />
                ),
              )}
            </Box>
          </Section>

          <Section title="Button — start and end icons">
            <Box twClassName="gap-2">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                startIconName={IconName.Send}
                onPress={() => undefined}
              >
                Primary with start icon
              </Button>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                endIconName={IconName.ArrowRight}
                onPress={() => undefined}
              >
                Secondary with end icon
              </Button>
            </Box>
          </Section>

          <Section title="AvatarIcon — sizes and severities">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-wrap"
            >
              {[AvatarIconSize.Sm, AvatarIconSize.Md, AvatarIconSize.Lg].map(
                (size) => (
                  <AvatarIcon
                    key={String(size)}
                    iconName={IconName.SwapHorizontal}
                    size={size}
                    severity={AvatarIconSeverity.Neutral}
                  />
                ),
              )}
              {[
                AvatarIconSeverity.Info,
                AvatarIconSeverity.Success,
                AvatarIconSeverity.Warning,
                AvatarIconSeverity.Danger,
              ].map((severity) => (
                <AvatarIcon
                  key={String(severity)}
                  iconName={IconName.Warning}
                  size={AvatarIconSize.Md}
                  severity={severity}
                />
              ))}
            </Box>
          </Section>

          <Section title="BadgeIcon">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <BadgeIcon iconName={IconName.Confirmation} />
              <BadgeIcon iconName={IconName.Warning} />
              <BadgeIcon iconName={IconName.Lock} />
            </Box>
          </Section>

          <Section title="BannerAlert — icon per severity">
            <Box twClassName="gap-2">
              <BannerAlert
                title="Informational"
                description="BannerAlert picks its own icon from severity."
              />
            </Box>
          </Section>

          <Section title="Tag — start and end icons">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2 flex-wrap"
            >
              <Tag startIconName={IconName.Star}>Start icon</Tag>
              <Tag endIconName={IconName.Close}>End icon</Tag>
            </Box>
          </Section>

          <Section title="SelectButton">
            <SelectButton
              startAccessory={
                <Icon name={IconName.Wallet} size={IconSize.Md} />
              }
              onPress={() => undefined}
            >
              <Text variant={TextVariant.BodyMd}>Select something</Text>
            </SelectButton>
          </Section>

          <Section title="ActionListItem">
            <Box>
              <ActionListItem
                label="With leading icon"
                description="ActionListItem renders iconName inline"
                iconName={IconName.Edit}
                onPress={() => undefined}
              />
              <ActionListItem
                label="Another action"
                iconName={IconName.Trash}
                onPress={() => undefined}
              />
            </Box>
          </Section>

          <Section title="MainActionButton">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3"
            >
              <MainActionButton
                iconName={IconName.Send}
                label="Send"
                onPress={() => undefined}
              />
              <MainActionButton
                iconName={IconName.SwapHorizontal}
                label="Swap"
                onPress={() => undefined}
              />
              <MainActionButton
                iconName={IconName.Add}
                label="Buy"
                onPress={() => undefined}
              />
            </Box>
          </Section>

          <Section title="Every mapped icon in this set">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-wrap"
            >
              {ALL_DS_ICON_NAMES.filter((n) => covered.has(n)).map((name) => (
                <Icon
                  key={name}
                  name={name as IconName}
                  size={IconSize.Lg}
                  color={IconColor.IconDefault}
                />
              ))}
            </Box>
          </Section>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default IconLab;
