//
//  WidgetEntryView.swift
//  MetaMaskWidget
//
//  Renders the fox header + a list of token rows, sized to the widget family.
//

import SwiftUI
import WidgetKit

struct WidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  var entry: TokenEntry

  /// Medium fits ~3 rows, Large ~7.
  private var maxRows: Int {
    family == .systemLarge ? 7 : 3
  }

  private var backgroundColor: Color {
    Color(red: 0.10, green: 0.11, blue: 0.13)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      header
      if entry.tokens.isEmpty {
        emptyState
      } else {
        rows
      }
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .widgetBackgroundCompat(backgroundColor)
  }

  private var header: some View {
    HStack(spacing: 8) {
      Image("fox")
        .resizable()
        .scaledToFit()
        .frame(width: 22, height: 22)
      Text("Tokens")
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(Color.white.opacity(0.6))
      Spacer()
    }
  }

  private var rows: some View {
    VStack(spacing: family == .systemLarge ? 8 : 6) {
      ForEach(entry.tokens.prefix(maxRows)) { token in
        // Tapping a row deep-links into the Swap screen with this token as the
        // source. Rows without a valid link render as plain (non-tappable) views.
        if let url = token.deeplinkURL {
          Link(destination: url) {
            TokenRowView(token: token)
          }
        } else {
          TokenRowView(token: token)
        }
      }
    }
  }

  private var emptyState: some View {
    Text("No tokens over $1 yet")
      .font(.system(size: 13))
      .foregroundColor(Color.white.opacity(0.5))
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// Applies the iOS 17 `containerBackground` when available (required for the
/// widget to render correctly on iOS 17+) and falls back to a plain background
/// fill on iOS 15/16.
private extension View {
  @ViewBuilder
  func widgetBackgroundCompat(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(color, for: .widget)
    } else {
      self.background(color)
    }
  }
}
