/* eslint-disable import/prefer-default-export */
export enum USER_INTENT {
  None,
  Create,
  CreateMultiple,
  EditMultiple,
  Confirm,
  Cancel,
  Import,
  ConnectHW,
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  ImportSrp,
  ///: END:ONLY_INCLUDE_IF
}
