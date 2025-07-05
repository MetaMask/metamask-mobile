package io.metamask

import com.facebook.react.ReactActivity

/**
 * Used for Android UI tests
 * 
 * TODO: Move into androidTest folder to be available only in tests
 */
class TestActivity : ReactActivity() {
  override fun getMainComponentName(): String = "MetaMask"
}
