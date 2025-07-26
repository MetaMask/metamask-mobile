package com.metamask.ui

import android.os.Environment
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.RootMatchers
import androidx.test.espresso.matcher.ViewMatchers.isClickable
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import com.metamask.ui.base.BaseBrowserUiTest
import org.hamcrest.Matchers.not
import org.junit.After
import org.junit.Assert
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * You can use Pixel 5 Api 34 Emulator, same as for E2E tests.
 *
 * To run update in [metamask-mobile/app/util/test/utils.js] export const isE2E = true;
 * Then click Run button in Android Studio or call
 * ./gradlew connectedFlaskDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.metamask.ui.BrowserDownloadFileTests
 *
 * Or you can run all UI tests using yarn test:native:android
 */
@RunWith(AndroidJUnit4::class)
class BrowserDownloadFileTests : BaseBrowserUiTest() {

  @After
  fun deleteDownloadedFiles() {
    File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "file.php").delete()
    File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "file.txt").delete()
  }

  @Test
  fun downloadFile() {
    openUrl("https://tyschenko.github.io/download_file.html")

    onMetaMaskWebView()
      .withElement(findElement(Locator.ID, "download_button"))
      .perform(webClick())

    val downloadButtonInDialog = onView(withText("Download")).inRoot(RootMatchers.isDialog())

    downloadButtonInDialog.check(matches(not(isEnabled()))) // Verify button is disabled to prevent tap jacking

    Thread.sleep(500) // Wait because of tap jacking rule

    downloadButtonInDialog
      .check(matches(isClickable()))
      .perform(ViewActions.click())

    device.openNotification()
    Thread.sleep(1_000) // Wait for the file to download

    Assert.assertTrue(device.findObject(UiSelector().textContains("Download complete.")).exists())
    device.pressBack() // Close notifications screen
    val downloadedFile = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "file.php")
    Assert.assertTrue(downloadedFile.exists())
    Assert.assertTrue(downloadedFile.length() > 1) // Verify that file doesn't weight 0 bytes
  }

  @Test
  fun downloadBlobFile() {
    openUrl("https://tyschenko.github.io/download_blob_file.html")

    onMetaMaskWebView()
      .withElement(findElement(Locator.ID, "download_button"))
      .perform(webClick())

    val downloadButtonInDialog = onView(withText("Download")).inRoot(RootMatchers.isDialog())

    downloadButtonInDialog.check(matches(not(isEnabled()))) // Verify button is disabled to prevent tap jacking

    Thread.sleep(500) // Wait because of tap jacking rule

    onView(withText("Download"))
      .inRoot(RootMatchers.isDialog())
      .perform(ViewActions.click())

    Thread.sleep(1_000) // Wait for the file to download

    device.wait(Until.hasObject(By.text("Downloaded successfully")), 5_000) // Verify Toast is displayed
    val downloadedFile = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "file.txt")
    Assert.assertTrue(downloadedFile.exists())
    Assert.assertTrue(downloadedFile.length() > 1) // Verify that file doesn't weight 0 bytes
  }

  @Test
  fun downloadBase64File() {
    openUrl("https://tyschenko.github.io/download_base64_file.html")

    onMetaMaskWebView()
      .withElement(findElement(Locator.ID, "download_button"))
      .perform(webClick())

    Thread.sleep(500) // Wait because of tap jacking rule

    onView(withText("Download"))
      .inRoot(RootMatchers.isDialog())
      .perform(ViewActions.click())

    Thread.sleep(1_000) // Wait for the file to download

    device.wait(Until.hasObject(By.text("Downloaded successfully")), 5_000) // Verify Toast is displayed
    val downloadedFile = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "file.txt")
    Assert.assertTrue(downloadedFile.exists())
    Assert.assertTrue(downloadedFile.length() > 1) // Verify that file doesn't weight 0 bytes
  }
}
