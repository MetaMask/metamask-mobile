import { useTheme } from '@react-navigation/native';
import { useMemo } from 'react';

type UseStylesType = <ParamsType, StyleSheetType>(
  createStyles: (params: ParamsType) => StyleSheetType,
  params: ParamsType,
) => StyleSheetType;

/**
 * useStyles, a custom hook that memoizes the stylesheet object with the supplied parameters
 * @param createStyles function which creates a stylesheet
 * @param params parameters that are used inside the stylesheet
 * @returns memoized stylesheet object
 */
const useStyles: UseStylesType = (createStyles, params) => {
  const theme = useTheme();
  return useMemo(
    () => createStyles({ theme, ...params }),
    [createStyles, params, theme],
  );
};

export default useStyles;
