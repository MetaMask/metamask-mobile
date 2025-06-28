package com.metamask.ui.base

import androidx.test.core.app.launchActivity
import androidx.test.uiautomator.UiSelector
import io.metamask.TestActivity
import org.junit.Before

abstract class BaseBrowserUiTest : BaseUiTest() {

  @Before
  fun loginAndOpenBrowser() {
    launchActivity<TestActivity>()
    device.findObject(UiSelector().resourceId("login-password-input")).setText("123123123")
    device.findObject(UiSelector().description("Unlock")).click()
    device.findObject(UiSelector().resourceId("tab-bar-item-Browser")).click()
  }
}
