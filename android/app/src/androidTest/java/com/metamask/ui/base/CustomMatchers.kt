package com.metamask.ui.base

import android.view.View
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher

object CustomMatchers {
  fun withMinimumWidth(minWidth: Int): Matcher<View> {
    return object : TypeSafeMatcher<View>() {
      override fun describeTo(description: Description) {
        description.appendText("View with minimum width of $minWidth")
      }

      override fun matchesSafely(view: View): Boolean {
        return view.width >= minWidth
      }
    }
  }
}
