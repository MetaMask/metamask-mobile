/**
 *
 * @param {string} testId e.g. create-password-first-input-field
 * @param {1|2} textfieldIndex legacy RN (//XCUIElementTypeOther[@name="textfield"])[n]
 */
export function iosPasswordInputXpath(testId, textfieldIndex) {
  return [
    `(//XCUIElementTypeSecureTextField[contains(@name,'${testId}') or contains(@label,'${testId}')])[1]`,
    `(//XCUIElementTypeTextField[contains(@name,'${testId}') or contains(@label,'${testId}')])[1]`,
    `(//*[(self::XCUIElementTypeSecureTextField or self::XCUIElementTypeTextField or (self::XCUIElementTypeOther and @name="textfield")) and (@name="${testId}" or @label="${testId}")])[1]`,
    `(//XCUIElementTypeOther[@name="textfield"])[${textfieldIndex}]`,
  ].join(' | ');
}
