export interface AddAccountActionsProps {
  onBack: () => void;
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  onAddHdAccount?: () => void;
  ///: END:ONLY_INCLUDE_IF
}
