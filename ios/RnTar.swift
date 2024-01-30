//
//  RnTar.swift
//  MetaMask
//
//  Created by Owen Craston on 2023-11-29.
//  Copyright © 2023 MetaMask. All rights reserved.
//

import Foundation

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

  func extractTgzFile(atPath path: String, toDirectory directory: String){
    
  }

  @objc func unTar(_ pathToRead: String, pathToWrite: String,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
    
        resolver("")
    
  }
}
