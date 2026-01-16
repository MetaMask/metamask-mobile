import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, TextInput, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
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
  FeatureFlagType,
  isMinimumRequiredVersionSupported,
} from '../../../util/feature-flags';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlagStats';
import { selectRawRemoteFeatureFlags } from '../../../selectors/featureFlagController';
import { useSelector } from 'react-redux';
import SelectOptionSheet from '../../UI/SelectOptionSheet';
interface FeatureFlagRowProps {
  flag: FeatureFlagInfo;
  onToggle: (key: string, newValue: unknown) => void;
}

export interface MinimumVersionFlagValue {
  enabled: boolean;
  minimumVersion: string;
}
interface AbTestType {
  name: string;
  value: unknown;
}

const FeatureFlagRow: React.FC<FeatureFlagRowProps> = ({ flag, onToggle }) => {
  const rawRemoteFeatureFlags = useSelector(selectRawRemoteFeatureFlags);
  const tw = useTailwind();
  const theme = useTheme();
  const [localValue, setLocalValue] = useState(flag.value);
  // Track whether the user is actively editing a text input to prevent
  // background flag refreshes from overwriting partially typed input
  const isEditingRef = useRef(false);
  // Track whether a reset is in progress to prevent onEndEditing from
  // reinstating the override with stale closure values
  const isResettingRef = useRef(false);

  useEffect(() => {
    // Sync localValue with flag.value when the flag is not overridden
    // and the user is not actively editing the input field.
    // This handles both clearing overrides and background config refreshes
    // while preventing race conditions during user input.
    if (!flag.isOverridden && !isEditingRef.current) {
      setLocalValue(flag.value);
    }
  }, [flag.value, flag.isOverridden]);
  const minimumVersion = (localValue as MinimumVersionFlagValue)
    ?.minimumVersion;
  const isVersionSupported = useMemo(
    () => isMinimumRequiredVersionSupported(minimumVersion || ''),
    [minimumVersion],
  );

  const handleResetOverride = () => {
    // Set resetting flag to prevent onEndEditing from reinstating the override
    // with stale closure values when the input loses focus due to button press
    isResettingRef.current = true;
    setLocalValue(flag.originalValue);
    onToggle(flag.key, null); // null indicates removal of override
  };

  const renderValueEditor = () => {
    switch (flag.type) {
      case FeatureFlagType.FeatureFlagBooleanWithMinimumVersion:
        return (
          <Box twClassName="items-end">
            <Switch
              value={(localValue as MinimumVersionFlagValue).enabled}
              disabled={!isVersionSupported}
              onValueChange={(newValue: boolean) => {
                const updatedValue = {
                  ...(localValue as MinimumVersionFlagValue),
                  enabled: newValue,
                };
                setLocalValue(updatedValue);
                onToggle(flag.key, updatedValue);
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
      case FeatureFlagType.FeatureFlagBoolean:
        return (
          <Switch
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
      case FeatureFlagType.FeatureFlagBooleanNested:
        return (
          <Switch
            value={(localValue as { value: boolean })?.value ?? false}
            onValueChange={(newValue: boolean) => {
              const updatedValue = {
                ...(localValue as { value: boolean }),
                value: newValue,
              };
              setLocalValue(updatedValue);
              onToggle(flag.key, updatedValue);
            }}
            trackColor={{
              true: theme.colors.primary.default,
              false: theme.colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            ios_backgroundColor={theme.colors.border.muted}
          />
        );
      case FeatureFlagType.FeatureFlagAbTest: {
        const abTestOptions = rawRemoteFeatureFlags[flag.key] as unknown as
          | AbTestType[]
          | undefined;
        const isOptionsAvailable =
          abTestOptions && Array.isArray(abTestOptions);

        const handleSelectOption = (name: string) => {
          if (!isOptionsAvailable) return;
          const selectedOption = abTestOptions.find(
            (option: { name: string }) => option.name === name,
          );
          if (selectedOption === undefined) {
            return;
          }
          setLocalValue(selectedOption);
          onToggle(flag.key, selectedOption);
        };

        // Safely extract name from localValue if it has AbTestType shape
        const selectedName =
          localValue &&
          typeof localValue === 'object' &&
          'name' in localValue &&
          typeof (localValue as AbTestType).name === 'string'
            ? (localValue as AbTestType).name
            : undefined;

        return (
          <Box
            twClassName="flex-1 ml-2 justify-center min-w-[160px]"
            pointerEvents={isOptionsAvailable ? 'auto' : 'none'}
          >
            <SelectOptionSheet
              options={
                isOptionsAvailable
                  ? abTestOptions.map((option: AbTestType) => ({
                      label: option.name,
                      value: option.name,
                    }))
                  : []
              }
              label={flag.key}
              defaultValue={selectedName}
              onValueChange={handleSelectOption}
              selectedValue={selectedName}
            />
          </Box>
        );
      }
      case FeatureFlagType.FeatureFlagString:
      case FeatureFlagType.FeatureFlagNumber:
        return (
          <Box twClassName="flex-1 ml-2">
            <TextInput
              value={String(localValue)}
              onFocus={() => {
                isEditingRef.current = true;
                // Reset any stale resetting state from a previous Reset button click
                // that occurred when the input wasn't focused (so onEndEditing never fired)
                isResettingRef.current = false;
              }}
              onChangeText={(text) => {
                const newValue =
                  flag.type === 'number' ? Number(text) || 0 : text;
                setLocalValue(newValue);
              }}
              onEndEditing={() => {
                isEditingRef.current = false;
                // Skip onToggle if a reset was just triggered to prevent
                // reinstating the override with stale closure values
                if (isResettingRef.current) {
                  isResettingRef.current = false;
                  return;
                }
                onToggle(flag.key, localValue);
              }}
              onBlur={() => {
                isEditingRef.current = false;
              }}
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

      case FeatureFlagType.FeatureFlagObject:
        return (
          <View>
            {Object.keys((localValue as object) || {}).map(
              (itemKey: string) => (
                <Text key={itemKey}>
                  {itemKey}:{' '}
                  {JSON.stringify(
                    (localValue as object)[itemKey as keyof object],
                  )}
                </Text>
              ),
            )}
          </View>
        );
      case FeatureFlagType.FeatureFlagArray:
        return (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => {
              Alert.alert(
                `${flag.key} (${flag.type})`,
                JSON.stringify(localValue, null, 2),
                [{ text: 'Cancel', style: 'cancel' }],
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
  const {
    setOverride,
    removeOverride,
    clearAllOverrides,
    featureFlagsList,
    getOverrideCount,
  } = useFeatureFlagOverride();
  const overrideCount = getOverrideCount();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'boolean'>('all');

  // Filter flags based on search query and type filter
  const filteredFlags = useMemo(() => {
    let flags = featureFlagsList;

    // Apply type filter
    if (typeFilter === 'boolean') {
      flags = flags.filter(
        (flag) =>
          flag.type === FeatureFlagType.FeatureFlagBoolean ||
          flag.type === FeatureFlagType.FeatureFlagBooleanWithMinimumVersion ||
          flag.type === FeatureFlagType.FeatureFlagBooleanNested,
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      flags = flags.filter((flag) =>
        flag.key.toLowerCase().includes(searchQuery.toLowerCase()),
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
            {`Clear All Overrides (${overrideCount})`}
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
