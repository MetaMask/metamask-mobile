import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { usePerpsFirstTimeUser } from '../../hooks';
import createStyles from './PerpsTutorialCarousel.styles';

const tutorialScreens = [
  {
    id: 'what_are_perps',
    title: strings('perps.tutorial.what_are_perps.title'),
    description: strings('perps.tutorial.what_are_perps.description'),
    subtitle: strings('perps.tutorial.what_are_perps.subtitle'),
  },
  {
    id: 'go_long_or_short',
    title: strings('perps.tutorial.go_long_or_short.title'),
    description: strings('perps.tutorial.go_long_or_short.description'),
    subtitle: strings('perps.tutorial.go_long_or_short.subtitle'),
  },
  {
    id: 'choose_leverage',
    title: strings('perps.tutorial.choose_leverage.title'),
    description: strings('perps.tutorial.choose_leverage.description'),
  },
  {
    id: 'watch_liquidation',
    title: strings('perps.tutorial.watch_liquidation.title'),
    description: strings('perps.tutorial.watch_liquidation.description'),
  },
  {
    id: 'close_anytime',
    title: strings('perps.tutorial.close_anytime.title'),
    description: strings('perps.tutorial.close_anytime.description'),
  },
  {
    id: 'ready_to_trade',
    title: strings('perps.tutorial.ready_to_trade.title'),
    description: strings('perps.tutorial.ready_to_trade.description'),
  },
];

const PerpsTutorialCarousel: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const { markTutorialCompleted } = usePerpsFirstTimeUser();
  const [currentTab, setCurrentTab] = useState(0);
  const safeAreaInsets = useSafeAreaInsets();
  const scrollableTabViewRef = useRef<
    ScrollableTabView & { goToPage: (pageNumber: number) => void }
  >(null);

  const isLastScreen = useMemo(
    () => currentTab === tutorialScreens.length - 1,
    [currentTab],
  );

  const handleTabChange = useCallback((obj: { i: number }) => {
    setCurrentTab(obj.i);
  }, []);

  const handleContinue = useCallback(() => {
    if (isLastScreen) {
      // Mark tutorial as completed
      markTutorialCompleted();
      // Navigate to deposit/add funds flow
      navigation.navigate(Routes.PERPS.DEPOSIT);
    } else {
      // Go to next screen using the ref
      const nextTab = Math.min(currentTab + 1, tutorialScreens.length - 1);
      scrollableTabViewRef.current?.goToPage(nextTab);
    }
  }, [isLastScreen, markTutorialCompleted, navigation, currentTab]);

  const handleSkip = useCallback(() => {
    if (isLastScreen) {
      // Mark tutorial as completed
      markTutorialCompleted();
    }
    navigation.goBack();
  }, [isLastScreen, markTutorialCompleted, navigation]);

  const renderTabBar = () => <View />;

  const buttonLabel = isLastScreen
    ? strings('perps.tutorial.add_funds')
    : strings('perps.tutorial.continue');

  const skipLabel = isLastScreen
    ? strings('perps.tutorial.got_it')
    : strings('perps.tutorial.skip');

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {tutorialScreens.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              currentTab === index && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Tutorial Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.carouselWrapper}>
          <ScrollableTabView
            ref={scrollableTabViewRef}
            renderTabBar={renderTabBar}
            onChangeTab={handleTabChange}
            initialPage={0}
          >
            {tutorialScreens.map((screen) => (
              <View key={screen.id} style={styles.screenContainer}>
                <View style={styles.contentContainer}>
                  <Text
                    variant={TextVariant.HeadingLG}
                    color={TextColor.Default}
                    style={styles.title}
                  >
                    {screen.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                    style={styles.description}
                  >
                    {screen.description}
                  </Text>
                  {screen.subtitle && (
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Alternative}
                      style={styles.subtitle}
                    >
                      {screen.subtitle}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollableTabView>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.buttonRow}>
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            onPress={handleContinue}
            size={ButtonSize.Lg}
            style={styles.continueButton}
            testID="perps-tutorial-continue-button"
          />
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButton}
            testID="perps-tutorial-skip-button"
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {skipLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PerpsTutorialCarousel;
