package com.metamask.ui.base

import androidx.test.core.app.launchActivity
import androidx.test.espresso.matcher.ViewMatchers.isJavascriptEnabled
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.sugar.Web.WebInteraction
import androidx.test.uiautomator.UiSelector
import io.metamask.TestActivity
import org.hamcrest.Matchers.allOf
import java.util.concurrent.TimeUnit
import org.junit.Before

abstract class BaseBrowserUiTest : BaseUiTest() {

  @Before
  fun loginAndOpenBrowser() {
    launchActivity<TestActivity>()
    device.findObject(UiSelector().resourceId("login-password-input")).setText("123123123")
    device.findObject(UiSelector().description("Unlock")).click()
    device.findObject(UiSelector().resourceId("tab-bar-item-Browser")).click()
  }

  fun openUrl(url: String) {
    device.findObject(UiSelector().resourceId("url-input")).click()
    device.findObject(UiSelector().resourceId("browser-modal-url-input")).setText(url)
    device.pressEnter()
  }

  fun onMetaMaskWebView() = onWebView(
    allOf(
      isJavascriptEnabled(),
      CustomMatchers.withMinimumWidth(1) // There are multiple webviews in the layout, we choose one that has width and height not equal to 0
    )
  ).withTimeout(10, TimeUnit.SECONDS)
}
