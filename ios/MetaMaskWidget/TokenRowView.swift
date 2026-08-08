//
//  TokenRowView.swift
//  MetaMaskWidget
//
//  One token row: logo + symbol (leading), mini price sparkline (center),
//  unit price over the 24h change % (trailing).
//

import SwiftUI

struct TokenRowView: View {
  let token: WidgetToken

  private let logoSize: CGFloat = 26

  // MetaMask success/error palette, approximated for the dark widget surface.
  private static let upColor = Color(red: 0.18, green: 0.78, blue: 0.45)
  private static let downColor = Color(red: 0.96, green: 0.33, blue: 0.33)
  private static let neutralColor = Color.white.opacity(0.45)

  /// Direction of the 24h move; drives both the arrow/% color and the line color.
  private var changeColor: Color {
    guard let change = token.priceChange1d, change != 0 else {
      return Self.neutralColor
    }
    return change > 0 ? Self.upColor : Self.downColor
  }

  var body: some View {
    HStack(spacing: 8) {
      logo
      Text(token.symbol)
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(.white)
        .lineLimit(1)
      Spacer(minLength: 6)
      if let sparkline = token.sparkline, sparkline.count > 1 {
        SparklineView(points: sparkline, color: changeColor)
          .frame(width: 52, height: 22)
      }
      VStack(alignment: .trailing, spacing: 1) {
        Text(token.priceFormatted)
          .font(.system(size: 15, weight: .medium))
          .foregroundColor(Color.white.opacity(0.85))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
        changeLabel
      }
    }
  }

  /// "▲ 2.31%" / "▼ 0.04%", colored green/red. Hidden when no change is known.
  @ViewBuilder
  private var changeLabel: some View {
    if let change = token.priceChange1d {
      let arrow = change > 0 ? "▲" : (change < 0 ? "▼" : "▪")
      Text("\(arrow) \(String(format: "%.2f%%", abs(change)))")
        .font(.system(size: 11, weight: .semibold))
        .foregroundColor(changeColor)
        .lineLimit(1)
    }
  }

  @ViewBuilder
  private var logo: some View {
    if let image = token.loadLogo() {
      Image(uiImage: image)
        .resizable()
        .scaledToFill()
        .frame(width: logoSize, height: logoSize)
        .clipShape(Circle())
    } else {
      // Monogram fallback (first letter of the symbol), matching the app's
      // AvatarToken behavior when a logo can't be rendered.
      ZStack {
        Circle().fill(Color.white.opacity(0.15))
        Text(String(token.symbol.prefix(1)).uppercased())
          .font(.system(size: 12, weight: .bold))
          .foregroundColor(.white)
      }
      .frame(width: logoSize, height: logoSize)
    }
  }
}

/// Non-interactive mini line chart. Normalizes the series to the available rect
/// (min → bottom, max → top) and strokes a single line. Pure SwiftUI `Shape`,
/// so it renders on every iOS version the widget targets without Swift Charts.
struct SparklineView: View {
  let points: [Double]
  let color: Color

  var body: some View {
    SparklineShape(points: points)
      .stroke(
        color,
        style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
      )
  }
}

private struct SparklineShape: Shape {
  let points: [Double]

  func path(in rect: CGRect) -> Path {
    var path = Path()
    guard points.count > 1 else { return path }

    let minValue = points.min() ?? 0
    let maxValue = points.max() ?? 0
    let range = maxValue - minValue
    let stepX = rect.width / CGFloat(points.count - 1)

    func pointAt(_ index: Int) -> CGPoint {
      let x = rect.minX + stepX * CGFloat(index)
      // Flat series → draw a centered horizontal line.
      let normalized =
        range == 0 ? 0.5 : (points[index] - minValue) / range
      let y = rect.maxY - CGFloat(normalized) * rect.height
      return CGPoint(x: x, y: y)
    }

    path.move(to: pointAt(0))
    for index in 1..<points.count {
      path.addLine(to: pointAt(index))
    }
    return path
  }
}
