import Foundation

struct GasFees: Decodable {
    let low: Int
    let medium: Int
    let high: Int
}

import Foundation

// Define a single struct that includes everything
struct GasEstimates: Codable {
    let low, medium, high: GasEstimateDetail
    let estimatedBaseFee: String
    let networkCongestion: Double
    let latestPriorityFeeRange, historicalPriorityFeeRange, historicalBaseFeeRange: [String]
    let priorityFeeTrend, baseFeeTrend: String

    // Embedded struct for the "low", "medium", and "high" keys
    struct GasEstimateDetail: Codable {
        let suggestedMaxPriorityFeePerGas, suggestedMaxFeePerGas: String
        let minWaitTimeEstimate, maxWaitTimeEstimate: Int
    }
}

final class GasFeeProvider {

  static let shared = GasFeeProvider()

  private init() {}

    public func fetchGasFees(chain_id: Integer) -> GasEstimates? {
    // Make a network request to the API.
    let url = URL(string: "https://gas.api.infura.io/networks/\(chain_id)/suggestedGasFees")!

    let semaphore = DispatchSemaphore(value: 0)

    var gasFees: GasEstimates?
    var request = URLRequest(url: url)
    request.setValue("<basic_authorization_token>", forHTTPHeaderField: "Authorization")
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        if let data = data {
          let dataRes = String(data: data, encoding: .utf8)
            // Parse the JSON response into a GasFees instance.
            let decoder = JSONDecoder()
            if let response = try? decoder.decode(GasEstimates.self, from: data) {
                gasFees = response
            } else {
                print("Failed to decode JSON")
            }
        } else if let error = error {
            print("Network request failed: \(error)")
        }
        semaphore.signal()
    }
    task.resume()
    semaphore.wait(wallTimeout: .distantFuture)
    return gasFees
}
}