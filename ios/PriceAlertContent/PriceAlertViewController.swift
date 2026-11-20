import UIKit
import UserNotifications
import UserNotificationsUI

private extension PriceAlert {
  var trend: UIColor {
    change >= 0 ? UIColor(red: 0.41, green: 0.89, blue: 0.64, alpha: 1)
      : UIColor(red: 1, green: 0.54, blue: 0.54, alpha: 1)
  }
}

private let orange = UIColor(red: 0.96, green: 0.52, blue: 0.11, alpha: 1)

final class PriceAlertViewController: UIViewController, UNNotificationContentExtension {
  func didReceive(_ notification: UNNotification) {
    let content = notification.request.content
    view.subviews.forEach { $0.removeFromSuperview() }
    view.backgroundColor = UIColor(red: 0.12, green: 0.10, blue: 0.13, alpha: 1)
    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 10
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
    ])
    guard let alert = PriceAlert(content.userInfo) else {
      extensionContext?.notificationActions = []
      stack.addArrangedSubview(label(content.title, size: 19, color: .white, weight: .bold))
      stack.addArrangedSubview(label(content.body, size: 15, color: .white))
      preferredContentSize = CGSize(width: view.bounds.width, height: 136)
      return
    }

    let header = UIStackView()
    header.spacing = 10
    header.alignment = .center
    let icon = label(alert.symbol == "ETH" ? "♦" : String(alert.symbol.prefix(1)),
                     size: 21, color: orange, weight: .bold)
    icon.textAlignment = .center
    icon.backgroundColor = orange.withAlphaComponent(0.16)
    icon.layer.cornerRadius = 17
    icon.clipsToBounds = true
    icon.isAccessibilityElement = false
    icon.widthAnchor.constraint(equalToConstant: 34).isActive = true
    icon.heightAnchor.constraint(equalToConstant: 34).isActive = true
    header.addArrangedSubview(icon)
    let type = alert.kind == "threshold" ? "TARGET ALERT" : "PRICE MOVEMENT"
    header.addArrangedSubview(label("\(alert.symbol)  /  \(type)", size: 12, color: orange, weight: .bold))
    stack.addArrangedSubview(header)

    let priceRow = UIStackView()
    priceRow.alignment = .center
    priceRow.spacing = 8
    let price = label(PriceAlert.usd(alert.price), size: 31, color: .white, weight: .bold)
    price.adjustsFontSizeToFitWidth = true
    price.minimumScaleFactor = 0.6
    price.numberOfLines = 1
    priceRow.addArrangedSubview(price)
    let formattedChange = alert.change.formatted(.number.precision(.fractionLength(0...2)))
    let prefix = alert.change >= 0 ? "+" : ""
    let chip = label("  \(prefix)\(formattedChange)%  ", size: 13, color: alert.trend, weight: .bold)
    chip.backgroundColor = alert.trend.withAlphaComponent(0.16)
    chip.layer.cornerRadius = 12
    chip.clipsToBounds = true
    chip.setContentCompressionResistancePriority(.required, for: .horizontal)
    chip.heightAnchor.constraint(equalToConstant: 24).isActive = true
    priceRow.addArrangedSubview(chip)
    stack.addArrangedSubview(priceRow)
    stack.addArrangedSubview(label(alert.description, size: 14, color: UIColor(white: 0.78, alpha: 1)))

    let graph = Sparkline(alert: alert)
    graph.heightAnchor.constraint(equalToConstant: 86).isActive = true
    stack.addArrangedSubview(graph)
    preferredContentSize = CGSize(width: view.bounds.width, height: 230)
  }

  private func label(_ text: String, size: CGFloat, color: UIColor, weight: UIFont.Weight = .regular) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = .systemFont(ofSize: size, weight: weight)
    label.textColor = color
    label.numberOfLines = 2
    return label
  }
}

private final class Sparkline: UIView {
  private let alert: PriceAlert

  init(alert: PriceAlert) {
    self.alert = alert
    super.init(frame: .zero)
    backgroundColor = .clear
    isAccessibilityElement = false
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ rect: CGRect) {
    let values = alert.points + [alert.target].compactMap { $0 }
    guard let minimum = values.min(), let maximum = values.max() else { return }
    let chart = rect.insetBy(dx: 4, dy: 10)
    func y(_ value: Double) -> CGFloat {
      let fraction = maximum == minimum ? 0.5 : (value - minimum) / (maximum - minimum)
      return chart.maxY - chart.height * fraction
    }
    if let target = alert.target {
      let marker = UIBezierPath()
      marker.move(to: CGPoint(x: chart.minX, y: y(target)))
      marker.addLine(to: CGPoint(x: chart.maxX, y: y(target)))
      marker.setLineDash([4, 5], count: 2, phase: 0)
      orange.setStroke()
      marker.stroke()
    }
    let line = UIBezierPath()
    for (index, value) in alert.points.enumerated() {
      let x = chart.minX + chart.width * CGFloat(index) / CGFloat(alert.points.count - 1)
      let point = CGPoint(x: x, y: y(value))
      if index == 0 { line.move(to: point) } else { line.addLine(to: point) }
    }
    line.lineWidth = 3
    line.lineJoinStyle = .round
    line.lineCapStyle = .round
    alert.trend.setStroke()
    line.stroke()
  }
}
