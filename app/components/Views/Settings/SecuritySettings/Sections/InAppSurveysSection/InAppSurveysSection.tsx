import React, { useEffect, useState, useCallback } from 'react';
import { Switch, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import createStyles from '../../SecuritySettings.styles';
import { useTheme } from '../../../../../../util/theme';
import {
  SurveyService,
  IntercomService,
} from '../../../../../../core/Intercom';
import Logger from '../../../../../../util/Logger';

const IN_APP_SURVEYS_SECTION = 'in-app-surveys-section';
export const IN_APP_SURVEYS_SWITCH = 'in-app-surveys-switch';
export const IN_APP_SURVEYS_TEST_BUTTON = 'in-app-surveys-test-button';

// Test survey ID for development/QA testing
const TEST_SURVEY_ID = '57951400';

/**
 * InAppSurveysSection - Toggle for in-app survey consent
 *
 * Implements the PRD requirement for survey consent gating:
 * - Settings → Privacy → In-app surveys [default off until consent]
 * - Rotating anonymous UUID on opt-out
 *
 * @see intercom/PRD.md for full requirements
 */
const InAppSurveysSection: React.FC = () => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const [surveysEnabled, setSurveysEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial consent state
  useEffect(() => {
    const loadConsent = async () => {
      try {
        const hasConsent = await SurveyService.hasConsent();
        setSurveysEnabled(hasConsent);
      } catch (error) {
        Logger.error(
          error as Error,
          'InAppSurveysSection: Failed to load consent',
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadConsent();
  }, []);

  const toggleSurveyConsent = useCallback(async (value: boolean) => {
    try {
      setIsLoading(true);
      await SurveyService.setConsent(value);
      setSurveysEnabled(value);
    } catch (error) {
      Logger.error(
        error as Error,
        'InAppSurveysSection: Failed to set consent',
      );
      // Revert on error
      setSurveysEnabled(!value);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Open the test survey for QA/development testing
   */
  const openTestSurvey = useCallback(async () => {
    try {
      setIsLoading(true);
      // Initialize Intercom if needed
      if (!IntercomService.isInitialized()) {
        await IntercomService.initialize();
      }
      // Present the test survey
      await IntercomService.presentSurvey(TEST_SURVEY_ID);
      Logger.log(`InAppSurveysSection: Opened test survey ${TEST_SURVEY_ID}`);
    } catch (error) {
      Logger.error(
        error as Error,
        'InAppSurveysSection: Failed to open test survey',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <View style={styles.halfSetting} testID={IN_APP_SURVEYS_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.in_app_surveys_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={surveysEnabled}
            onValueChange={toggleSurveyConsent}
            disabled={isLoading}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={IN_APP_SURVEYS_SWITCH}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.in_app_surveys_description')}
      </Text>
      <Button
        label={strings('app_settings.in_app_surveys_test_button')}
        variant={ButtonVariants.Secondary}
        onPress={openTestSurvey}
        disabled={isLoading}
        style={styles.accessory}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Md}
        testID={IN_APP_SURVEYS_TEST_BUTTON}
      />
    </View>
  );
};

export default React.memo(InAppSurveysSection);
