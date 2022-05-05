import { useMemo } from 'react';

type UseStylesType = <ParamsType, StyleSheetType>(
  createStyles: (params: ParamsType) => StyleSheetType,
  params: ParamsType,
) => StyleSheetType;

const useStyles: UseStylesType = (createStyles, params) =>
  useMemo(() => createStyles(params), [createStyles, params]);

export default useStyles;
