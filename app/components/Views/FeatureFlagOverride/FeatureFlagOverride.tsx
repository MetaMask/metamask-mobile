import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Alert, TextInput, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import {
  FeatureFlagInfo,
  isMinimumRequiredVersionSupported,
} from '../../../util/feature-flags';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlagStats';

interface FeatureFlagRowProps {
  flag: FeatureFlagInfo;
  onToggle: (key: string, newValue: unknown) => void;
}

interface MinimumVersionFlagValue {
  enabled: boolean;
  minimumVersion: string;
}
const FeatureFlagRow: React.FC<FeatureFlagRowProps> = ({ flag, onToggle }) => {
  const tw = useTailwind();
  const theme = useTheme();
  const [localValue, setLocalValue] = useState(flag.value);
  const minimumVersion = (localValue as MinimumVersionFlagValue)
    ?.minimumVersion;
  const isVersionSupported = useMemo(
    () => isMinimumRequiredVersionSupported(minimumVersion || ''),
    [minimumVersion],
  );

  const handleResetOverride = () => {
    setLocalValue(flag.originalValue);
    onToggle(flag.key, null); // null indicates removal of override
  };

  const renderValueEditor = () => {
    switch (flag.type) {
      case 'boolean with minimumVersion':
        return (
          <Box twClassName="items-end">
            <Switch
              value={(localValue as MinimumVersionFlagValue).enabled}
              disabled //={!isVersionSupported} TODO: Uncomment this when we support overrides for minimum version
              onValueChange={(newValue: boolean) => {
                setLocalValue({
                  ...(localValue as MinimumVersionFlagValue),
                  enabled: newValue,
                });
                onToggle(flag.key, newValue);
              }}
              trackColor={{
                true: theme.colors.primary.default,
                false: theme.colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={theme.colors.border.muted}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-right max-w-[100px] flex-wrap"
            >
              <Box
                twClassName={`w-2 h-2 rounded-full flex items-center justify-center ${
                  isVersionSupported ? 'bg-success-default' : 'bg-error-default'
                }`}
              />{' '}
              Minimum Version:{' '}
              {(localValue as MinimumVersionFlagValue).minimumVersion}
            </Text>
          </Box>
        );
      case 'boolean':
        return (
          <Switch
            disabled
            value={localValue as boolean}
            onValueChange={(newValue: boolean) => {
              setLocalValue(newValue);
              onToggle(flag.key, newValue);
            }}
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            ios_backgroundColor={theme.colors.border.muted}
          />
        );
      case 'string':
      case 'number':
        return (
          <Box twClassName="flex-1 ml-2">
            <TextInput
              value={String(localValue)}
              onChangeText={(text) => {
                const newValue =
                  flag.type === 'number' ? Number(text) || 0 : text;
                setLocalValue(newValue);
              }}
              onEndEditing={() => onToggle(flag.key, localValue)}
              style={[
                tw.style('border rounded p-2 text-sm'),
                {
                  borderColor: theme.colors.border.default,
                  color: theme.colors.text.default,
                  backgroundColor: theme.colors.background.default,
                },
              ]}
              placeholder={`Enter ${flag.type} value`}
              placeholderTextColor={theme.colors.text.muted}
              keyboardType={flag.type === 'number' ? 'numeric' : 'default'}
            />
          </Box>
        );

      case 'object':
        return (
          <View>
            {Object.keys(localValue as object).map((itemKey: string) => (
              <Text key={itemKey}>
                {itemKey}:{' '}
                {JSON.stringify(
                  (localValue as object)[itemKey as keyof object],
                )}
              </Text>
            ))}
          </View>
        );
      case 'array':
        return (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => {
              Alert.alert(
                `${flag.key} (${flag.type})`,
                JSON.stringify(localValue, null, 2),
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset to Default',
                    onPress: () => {
                      setLocalValue(flag.value);
                      onToggle(flag.key, flag.value);
                    },
                  },
                ],
              );
            }}
          >
            View/Edit
          </Button>
        );

      default:
        return (
          <Text variant={TextVariant.BodySm} color={TextColor.TextMuted}>
            {String(localValue)}
          </Text>
        );
    }
  };

  return (
    <Box twClassName="p-4 border-b border-border-muted">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-2"
      >
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-1"
          >
            <Text variant={TextVariant.BodyMd}>{flag.key}</Text>
          </Box>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Type: {flag.type}
            {flag.description && ` • ${flag.description}`}
          </Text>
          {flag.isOverridden && flag.originalValue !== undefined && (
            <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
              Original: {JSON.stringify(flag.originalValue)}
            </Text>
          )}
          {flag.type === 'object' && renderValueEditor()}
        </Box>
        <Box twClassName="ml-4 items-end">
          {flag.type !== 'object' && renderValueEditor()}
          {flag.isOverridden && (
            <Box twClassName="ml-2 px-2 py-1 my-2 bg-warning-muted rounded">
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.WarningDefault}
              >
                OVERRIDDEN
              </Text>
            </Box>
          )}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            {flag.isOverridden && (
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Sm}
                onPress={handleResetOverride}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const FeatureFlagOverride: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const tw = useTailwind();

  const flagStats = useFeatureFlagStats();
  const { setOverride, removeOverride, clearAllOverrides, featureFlagsList } =
    useFeatureFlagOverride();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'boolean'>('all');

  // Filter flags based on search query and type filter
  const filteredFlags = useMemo(() => {
    let flags = featureFlagsList;

    // Apply type filter
    if (typeFilter === 'boolean') {
      flags = flags.filter(
        (flag) =>
          flag.type === 'boolean' ||
          flag.type === 'boolean with minimumVersion' ||
          flag.type === 'boolean nested',
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      flags = flags.filter(
        (flag) =>
          flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          flag.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return flags;
  }, [featureFlagsList, searchQuery, typeFilter]);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        'Feature Flag Override',
        navigation,
        false,
        theme.colors,
        null,
      ),
    );
  }, [navigation, theme.colors]);

  const handleToggleFlag = useCallback(
    (key: string, newValue: unknown) => {
      try {
        if (newValue === null) {
          // Remove override
          removeOverride(key);
        } else {
          // Set override
          setOverride(key, newValue);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          `Failed to update feature flag: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
    [setOverride, removeOverride],
  );

  const handleClearAllOverrides = useCallback(() => {
    Alert.alert(
      'Clear All Overrides',
      'Are you sure you want to clear all feature flag overrides? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            try {
              clearAllOverrides();
            } catch (error) {
              Alert.alert(
                'Error',
                `Failed to clear overrides: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              );
            }
          },
        },
      ],
    );
  }, [clearAllOverrides]);

  return (
    <Box twClassName="flex-1 bg-background-default">
      {/* Header with stats */}
      <Box twClassName="p-4 bg-background-alternative border-b border-border-muted">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-2"
        >
          <Text variant={TextVariant.BodyMd}>Feature Flag Statistics</Text>
          {(typeFilter !== 'all' || searchQuery) && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Showing: {filteredFlags.length} flags
            </Text>
          )}
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="flex-wrap gap-2">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Total: {flagStats.total}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Boolean: {flagStats.boolean}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Object: {flagStats.object}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            String: {flagStats.string}
          </Text>
        </Box>
      </Box>

      {/* Search and controls */}
      <Box twClassName="p-4 border-b border-border-muted">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search feature flags..."
          placeholderTextColor={theme.colors.text.muted}
          style={[
            tw.style('border rounded p-3 mb-3'),
            {
              borderColor: theme.colors.border.default,
              color: theme.colors.text.default,
              backgroundColor: theme.colors.background.default,
            },
          ]}
        />

        <Box twClassName="flex-row justify-between items-start">
          {/* Filter Buttons */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2 flex-wrap"
          >
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              onPress={() =>
                setTypeFilter(typeFilter === 'boolean' ? 'all' : 'boolean')
              }
            >
              {typeFilter === 'boolean'
                ? `Boolean (${flagStats.boolean})`
                : `All (${featureFlagsList.length})`}
            </Button>
          </Box>

          {/* Clear All Button */}
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleClearAllOverrides}
          >
            Clear All Overrides
          </Button>
        </Box>
      </Box>

      {/* Feature flags list */}
      <ScrollView style={tw.style('flex-1 bg-background-default')}>
        {filteredFlags.length === 0 ? (
          <Box twClassName="p-8 items-center">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {searchQuery && typeFilter !== 'all'
                ? `No ${typeFilter} feature flags match your search.`
                : searchQuery
                ? 'No feature flags match your search.'
                : typeFilter !== 'all'
                ? `No ${typeFilter} feature flags available.`
                : 'No feature flags available.'}
            </Text>
          </Box>
        ) : (
          filteredFlags.map((flag) => (
            <FeatureFlagRow
              key={flag.key}
              flag={flag}
              onToggle={handleToggleFlag}
            />
          ))
        )}
      </ScrollView>
    </Box>
  );
};

export default FeatureFlagOverride;
