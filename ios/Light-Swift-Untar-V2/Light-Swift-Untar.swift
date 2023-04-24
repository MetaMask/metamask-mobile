//
//  Light-Swift-Untar.swift
//  MetaMask
//
//  Created by Owen Craston on 2023-03-13.
//  Copyright © 2023 MetaMask. All rights reserved.
//

// https://github.com/UInt2048/Light-Swift-Untar

import Foundation

public typealias Closure = (Double) -> Void

enum UntarError: Error, LocalizedError {
  case notFound(file: String)
  case corruptFile(type: UnicodeScalar)
  public var errorDescription: String? {
    switch self {
    case let .notFound(file: file): return "Source file \(file) not found"
    case let .corruptFile(type: type): return "Invalid block type \(type) found"
    }
  }
}

public extension FileManager {
  // MARK: - Definitions
  private static var tarBlockSize: UInt64 = 512
  private static var tarTypePosition: UInt64 = 156
  private static var tarNamePosition: UInt64 = 0
  private static var tarNameSize: UInt64 = 100
  private static var tarSizePosition: UInt64 = 124
  private static var tarSizeSize: UInt64 = 12
  private static var tarMaxBlockLoadInMemory: UInt64 = 100

  // MARK: - Private Methods
  private func createFilesAndDirectories(path: String, tarObject: Any, size: UInt64,
                                         progress progressClosure: Closure?) throws -> Bool {
    try! createDirectory(atPath: path, withIntermediateDirectories: true, attributes: nil)
    var location: UInt64 = 0
    while location < size {
      var blockCount: UInt64 = 1
      if let closure = progressClosure { closure(Double(location) / Double(size)) }

      let type = self.type(object: tarObject, offset: location)
      switch type {
      case "0": // File
        let name = self.name(object: tarObject, offset: location)
        let filePath = URL(fileURLWithPath: path).appendingPathComponent(name).path
        let size = self.size(object: tarObject, offset: location)
        if size == 0 { try "".write(toFile: filePath, atomically: true, encoding: .utf8) } else {
          blockCount += (size - 1) / FileManager.tarBlockSize + 1 // size / tarBlockSize rounded up
          writeFileData(object: tarObject, location: location + FileManager.tarBlockSize,
                        length: size, path: filePath)
        }
      case "5": // Directory
        let name = self.name(object: tarObject, offset: location)
        let directoryPath = URL(fileURLWithPath: path).appendingPathComponent(name).path
        try createDirectory(atPath: directoryPath, withIntermediateDirectories: true,
                            attributes: nil)
      case "\0": break // Null block
      case "x": blockCount += 1 // Extra header block
      case "1": fallthrough
      case "2": fallthrough
      case "3": fallthrough
      case "4": fallthrough
      case "6": fallthrough
      case "7": fallthrough
      case "g": // Not a file nor directory
        let size = self.size(object: tarObject, offset: location)
        blockCount += UInt64(ceil(Double(size) / Double(FileManager.tarBlockSize)))
      default: throw UntarError.corruptFile(type: type) // Not a tar type
      }
      location += blockCount * FileManager.tarBlockSize
    }
    return true
  }

  private func type(object: Any, offset: UInt64) -> UnicodeScalar {
    let typeData = data(object: object, location: offset + FileManager.tarTypePosition, length: 1)!
    return UnicodeScalar([UInt8](typeData)[0])
  }

  private func name(object: Any, offset: UInt64) -> String {
    var nameSize = FileManager.tarNameSize
    for i in 0...FileManager.tarNameSize {
      let char = String(data: data(object: object, location: offset + FileManager.tarNamePosition + i, length: 1)!, encoding: .ascii)!
      if char == "\0" {
        nameSize = i
        break
      }
    }
    return String(data: data(object: object, location: offset + FileManager.tarNamePosition, length: nameSize)!, encoding: .utf8)!
  }

  private func size(object: Any, offset: UInt64) -> UInt64 {
    let sizeData = data(object: object, location: offset + FileManager.tarSizePosition,
                        length: FileManager.tarSizeSize)!
    let sizeString = String(data: sizeData, encoding: .ascii)!
    return strtoull(sizeString, nil, 8) // Size is an octal number, convert to decimal
  }

  private func writeFileData(object: Any, location _loc: UInt64, length _len: UInt64,
                             path: String) {
    let pathURL = URL(fileURLWithPath: path)
    let directoryPathURL = pathURL.deletingLastPathComponent()
    if let data = object as? Data {
      if !fileExists(atPath: directoryPathURL.path) {
        try! createDirectory(atPath: directoryPathURL.path, withIntermediateDirectories: true)
      }
      createFile(atPath: path, contents: data.subdata(in: Int(_loc) ..< Int(_loc + _len)),
                 attributes: nil)
    } else if let fileHandle = object as? FileHandle {
      if NSData().write(toFile: path, atomically: false) {
        let destinationFile = FileHandle(forWritingAtPath: path)!
        fileHandle.seek(toFileOffset: _loc)

        let maxSize = FileManager.tarMaxBlockLoadInMemory * FileManager.tarBlockSize
        var length = _len, location = _loc
        while length > maxSize {
          autoreleasepool { // Needed to prevent heap overflow when reading large files
            destinationFile.write(fileHandle.readData(ofLength: Int(maxSize)))
          }
          location += maxSize
          length -= maxSize
        }
        autoreleasepool { // Needed to prevent heap overflow when reading large files
          destinationFile.write(fileHandle.readData(ofLength: Int(length)))
        }
        destinationFile.closeFile()
      }
    }
  }

  private func data(object: Any, location: UInt64, length: UInt64) -> Data? {
    if let data = object as? Data {
      return data.subdata(in: Int(location) ..< Int(location + length))
    } else if let fileHandle = object as? FileHandle {
      fileHandle.seek(toFileOffset: location)
      return autoreleasepool { // Needed to prevent heap overflow when reading large files
        fileHandle.readData(ofLength: Int(length))
      }
    }
    return nil
  }

  // MARK: - Public Methods
  // Return true when no error for convenience
  @discardableResult func createFilesAndDirectories(path: String, tarData: Data,
                                                    progress: Closure? = nil) throws -> Bool {
    try createFilesAndDirectories(path: path, tarObject: tarData, size: UInt64(tarData.count),
                                  progress: progress)
  }

  @discardableResult func createFilesAndDirectories(url: URL, tarData: Data,
                                                    progress: Closure? = nil) throws -> Bool {
    try createFilesAndDirectories(path: url.path, tarData: tarData, progress: progress)
  }

  @discardableResult func createFilesAndDirectories(path: String, tarPath: String,
                                                    progress: Closure? = nil) throws -> Bool {
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: tarPath) {
      let attributes = try fileManager.attributesOfItem(atPath: tarPath)
      let size = attributes[.size] as! UInt64
      let fileHandle = FileHandle(forReadingAtPath: tarPath)!
      let result = try createFilesAndDirectories(path: path, tarObject: fileHandle, size: size,
                                                 progress: progress)
      fileHandle.closeFile()
      return result
    }

    throw UntarError.notFound(file: tarPath)
  }
}
