import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../../shared/scrollableScreenSafeArea';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface ManageProfileScreenChromeProps {
  title: string;
  testID: string;
  headerTestID: string;
  backTestID: string;
  children: ReactNode;
}

const ManageProfileScreenChrome: React.FC<ManageProfileScreenChromeProps> = ({
  title,
  testID,
  headerTestID,
  backTestID,
  children,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation();
  const tw = useTailwind();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={testID}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title={title}
        onBack={handleBack}
        backButtonProps={{ testID: backTestID }}
        endAccessory={<Box twClassName="w-10" />}
        testID={headerTestID}
      />
      {children}
    </SafeAreaView>
  );
};

export default ManageProfileScreenChrome;
