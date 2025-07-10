import XCTest
import Network

final class BrowserDownloadFileTests: XCTestCase {
  
  private var app: XCUIApplication!
  
  override func setUpWithError() throws {
    try super.setUpWithError()
    continueAfterFailure = false
    app = XCUIApplication()
    app.launchEnvironment["IS_RUNNING_UI_TESTS"] = "YES"
    app.launch()
    loginAndOpenBrowser()
  }
  
  func testDownloadBlobFile() throws {
    let testURL = "https://tyschenko.github.io/download_blob_file.html"
    navigateToURL(testURL)
    
    let webViews = app.webViews
    XCTAssertTrue(webViews.count > 0, "No web views found")
    
    let webView = webViews.element(boundBy: 0)
    XCTAssertTrue(webView.waitForExistence(timeout: 5))
    
    let downloadButton = webView.buttons["Download File"]
    XCTAssert(downloadButton.waitForExistence(timeout: 5), "Download File button inside website not found")
    downloadButton.tap()
    
    let downloadDialog = app.alerts.firstMatch
    XCTAssert(downloadDialog.waitForExistence(timeout: 5), "Download dialog not found")
    sleep(1) // Wait for tap jacking delay
    let downloadConfirmButton = downloadDialog.buttons["Download"].firstMatch
    XCTAssert(downloadConfirmButton.waitForExistence(timeout: 5), "Download button in dialog not found")
    downloadConfirmButton.tap()
    
    let saveButton = app.buttons["Save"]
    XCTAssert(saveButton.waitForExistence(timeout: 5), "Save button not found")
    saveButton.tap()
    
    sleep(3) // Wait for the file to download

    verifyFileIsDownloadedAndCleanUp()
  }
  
  func testDownloadBase64File() throws {
    let testURL = "https://tyschenko.github.io/download_base64_file.html"
    navigateToURL(testURL)
    
    let webViews = app.webViews
    XCTAssertTrue(webViews.count > 0, "No web views found")
    
    let webView = webViews.element(boundBy: 0)
    XCTAssertTrue(webView.waitForExistence(timeout: 5))
    
    let downloadButton = webView.buttons["Download File"]
    XCTAssert(downloadButton.waitForExistence(timeout: 5), "Download File button inside website not found")
    downloadButton.tap()
    
    let downloadDialog = app.alerts.firstMatch
    XCTAssert(downloadDialog.waitForExistence(timeout: 5), "Download dialog not found")
    sleep(1) // Wait for tap jacking delay
    let downloadConfirmButton = downloadDialog.buttons["Download"].firstMatch
    XCTAssert(downloadConfirmButton.waitForExistence(timeout: 5), "Download button in dialog not found")
    downloadConfirmButton.tap()
    
    let saveButton = app.buttons["Save"]
    XCTAssert(saveButton.waitForExistence(timeout: 5), "Save button not found")
    saveButton.tap()
    
    sleep(3) // Wait for the file to download

    verifyFileIsDownloadedAndCleanUp()
  }
  
  private func loginAndOpenBrowser() {
    let passwordInput = app.secureTextFields["login-password-input"].firstMatch
    XCTAssert(passwordInput.waitForExistence(timeout: 5))
    passwordInput.tap()
    passwordInput.typeText("123123123")
    
    let unlockButton = app.buttons["Unlock"].firstMatch
    XCTAssert(unlockButton.waitForExistence(timeout: 5))
    unlockButton.tap()
    
    let browserTab = app.otherElements["tab-bar-item-Browser"].firstMatch
    XCTAssert(browserTab.waitForExistence(timeout: 5))
    browserTab.tap()
  }
  
  private func navigateToURL(_ url: String) {
    // Find and tap the URL input - first tap the container, then the text field
    let urlInputContainer = app.otherElements["url-input"].firstMatch
    XCTAssert(urlInputContainer.waitForExistence(timeout: 5))
    urlInputContainer.tap()
    
    let urlInputField = app.textFields["browser-modal-url-input"].firstMatch
    XCTAssert(urlInputField.waitForExistence(timeout: 5))
    urlInputField.tap()
    
    let clearIcon = app.otherElements["url-clear-icon"]
    XCTAssert(clearIcon.waitForExistence(timeout: 5))
    clearIcon.tap()
    
    urlInputField.typeText(url)
    app.keyboards.buttons["go"].tap()
  }
  
  private func verifyFileIsDownloadedAndCleanUp() {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    XCUIDevice.shared.press(.home)

    let filesAppIcon = springboard.icons["Files"]
    XCTAssertTrue(filesAppIcon.waitForExistence(timeout: 5), "Files app not found on Home screen")
    filesAppIcon.tap()
    
    let filesApp = XCUIApplication(bundleIdentifier: "com.apple.DocumentsApp")
    XCTAssertTrue(filesApp.wait(for: .runningForeground, timeout: 5))
    
    let onMyIphone = filesApp.cells.staticTexts["On My iPhone"]
    if onMyIphone.waitForExistence(timeout: 5) {
      onMyIphone.tap()
    }

    let fileCell = filesApp.cells.staticTexts["File"]
    XCTAssertTrue(fileCell.waitForExistence(timeout: 5), "File.txt not found in Files app")
    fileCell.press(forDuration: 1.0)
    
    let deleteButton = filesApp.buttons["Delete"]
    XCTAssertTrue(deleteButton.waitForExistence(timeout: 5), "Delete button not found after long press")
    deleteButton.tap()
  }
}
