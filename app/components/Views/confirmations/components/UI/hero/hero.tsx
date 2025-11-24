import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { TooltipModal } from '../Tooltip/Tooltip';
import styleSheet from './hero.styles';

interface TitleProps {
  title: React.ReactNode | string;
  setIsModalVisible?: (isModalVisible: boolean) => void;
  styles: StyleSheet.NamedStyles<Record<string, unknown>>;
}

const Title = ({ title, setIsModalVisible, styles }: TitleProps) => {
  const isStringTitle = typeof title === 'string';

  return (
    // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
    // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
    <View style={styles.title}>
      {setIsModalVisible ? (
        <TouchableOpacity onPress={() => setIsModalVisible(true)}>
          {isStringTitle ? (
            <Text
              // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
              // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
              style={styles.titleText}
              variant={TextVariant.HeadingLG}
            >
              {title}
            </Text>
          ) : (
            title
          )}
        </TouchableOpacity>
      ) : isStringTitle ? (
        // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
        // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
        <Text style={styles.titleText} variant={TextVariant.HeadingLG}>
          {title}
        </Text>
      ) : (
        title
      )}
    </View>
  );
};

interface HeroProps {
  componentAsset: React.ReactNode;
  title: React.ReactNode | string;

  hasPaddingTop?: boolean;
  subtitle?: string;
  tooltipModalProps?: {
    hasTooltip?: boolean;
    isEnabled?: boolean;
    content?: string;
    title?: string;
    testId?: string;
  };
}

/**
 * Hero component
 * @example
 *
 * <Hero
 *   componentAsset={<Asset />}
 *   hasPaddingTop
 *   subtitle="Subtitle"
 *   title={<Title />}
 *   tooltipModalProps={{ hasTooltip: true, isEnabled: true, content: 'Tooltip content', title: 'Tooltip title', testId: 'tooltip-modal' }}
 * />
 */
export const Hero = ({
  componentAsset,
  hasPaddingTop = false,
  subtitle,
  title,
  tooltipModalProps = {},
}: HeroProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { styles } = useStyles(styleSheet, {
    hasPaddingTop,
  });

  return (
    <View style={styles.base}>
      {componentAsset}
      <Title
        title={title}
        setIsModalVisible={
          tooltipModalProps.isEnabled ? setIsModalVisible : undefined
        }
        styles={styles}
      />
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {tooltipModalProps.isEnabled && (
        <TooltipModal
          open={isModalVisible}
          setOpen={setIsModalVisible}
          content={tooltipModalProps.content}
          title={tooltipModalProps.title}
          tooltipTestId={tooltipModalProps.testId}
        />
      )}
    </View>
  );
};
