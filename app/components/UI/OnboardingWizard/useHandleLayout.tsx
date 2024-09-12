import { useCallback, useEffect, useState } from 'react';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useHandleLayout = (coachmarkRef: any) => {
  const [coachmarkTop, setCoachmarkTop] = useState(0);

  const handleLayout = useCallback(() => {
    const yourAccRef = coachmarkRef.yourAccountRef?.current;
    if (!yourAccRef) return;

    yourAccRef.measure(
      (
        _accActionsFx: number,
        _accActionsFy: number,
        _accActionsWidth: number,
        accActionsHeight: number,
        _accActionsPageX: number,
        accActionsPageY: number,
      ) => {
        const top = accActionsHeight + accActionsPageY;
        setCoachmarkTop(top);
      },
    );
  }, [coachmarkRef.yourAccountRef]);

  useEffect(() => {
    handleLayout();
  }, [handleLayout]);

  return {
    coachmarkTop,
  };
};

export default useHandleLayout;
