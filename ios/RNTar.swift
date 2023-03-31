//
//  RNTar.swift
//  MetaMask
//
//  Created by Owen Craston on 2023-03-10.
//  Copyright © 2023 MetaMask. All rights reserved.
//

import Foundation
import Gzip

enum UnTarError: Error, LocalizedError {
  case unableToDecompressFile(file: String, error: Error? = nil)
  case sourceFileNotFound(file: String)
  public var errorDescription: String? {
    switch self {
    case let .unableToDecompressFile(file: file, error: error):
      return "RNTar failed to decompress file \(file)  \(error as Optional)"
    case let .sourceFileNotFound(file: file):
      return "Source file \(file) not found"
    }
  }
}

@objc(RNTar)
class RNTar: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  func extractTgzFile(atPath path: String, toDirectory directory: String) throws -> String {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: path) else {
      throw UnTarError.sourceFileNotFound(file: path)
    }
    let sourceUrl = URL(fileURLWithPath: path)
    let destinationUrl = URL(fileURLWithPath: directory, isDirectory: true)
    // Read the compressed data from the file
    guard
        let data = try? Data(contentsOf: sourceUrl),
        let decompressedData = data.isGzipped ? try? data.gunzipped() : data
    else {
      throw UnTarError.unableToDecompressFile(file: path)
    }

    if !fileManager.fileExists(atPath: sourceUrl.path) {
      do {
        try (fileManager.createDirectory(atPath: sourceUrl.path, withIntermediateDirectories: true))
      } catch {
        throw UnTarError.unableToDecompressFile(file: path)
      }
    }
    let untarResponse = try FileManager.default
      .createFilesAndDirectories(path: destinationUrl.path, tarData: decompressedData)

    if untarResponse {
      return "\(destinationUrl.path)/package"
    }
    throw UnTarError.unableToDecompressFile(file: destinationUrl.path)
  }

  @objc func unTar(_ pathToRead: String, pathToWrite: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    do {
        let uncompressedPath = try extractTgzFile(atPath: pathToRead, toDirectory: pathToWrite)
        resolver(uncompressedPath)
    } catch {
        rejecter("Error uncompressing file:", error.localizedDescription, error)
    }
  }
}
