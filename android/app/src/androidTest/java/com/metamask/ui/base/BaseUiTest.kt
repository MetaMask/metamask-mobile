package com.metamask.ui.base

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before

/**
 * To run all UI tests call yarn test:native:android
 */
abstract class BaseUiTest {

  val device: UiDevice by lazy(LazyThreadSafetyMode.NONE) {
    UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
  }

  private lateinit var mockWebServer: MockWebServer

  @Before
  fun mockAccount() {
    mockWebServer = MockWebServer()
    mockWebServer.start(12345)
    mockWebServer.enqueue(
      MockResponse()
        .setResponseCode(200)
        .setHeader("Content-Type", "application/json")
        .setBody(Fixtures.DEFAULT_FIXTURES_JSON)
        .addHeader("Access-Control-Allow-Origin", "*")
        .addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .addHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    )
  }

  @After
  fun shutdown() {
    mockWebServer.shutdown()
  }
}
