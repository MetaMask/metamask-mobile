package com.metamask.ui.base

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before

abstract class BaseUiTest {

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
