import Darwin
import Foundation

enum RefreshLockError: Error {
    case unavailable
}

public final class AppGroupRefreshLock {
    private let fileURL: URL
    private var fd: Int32 = -1

    public init(directory: URL) {
        self.fileURL = directory.appendingPathComponent("card-refresh.lock")
    }

    public func acquire(timeout: TimeInterval) -> Bool {
        if fd >= 0 { return true }
        let path = fileURL.path
        let opened = open(path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard opened >= 0 else { return false }
        var lock = flock()
        lock.l_type = Int16(F_WRLCK)
        lock.l_whence = Int16(SEEK_SET)
        lock.l_start = 0
        lock.l_len = 0
        let deadline = Date().addingTimeInterval(timeout)
        while true {
            let result = fcntl(opened, F_SETLK, &lock)
            if result == 0 {
                fd = opened
                return true
            }
            if Date() >= deadline {
                close(opened)
                return false
            }
            usleep(50_000)
        }
    }

    public func release() {
        guard fd >= 0 else { return }
        var lock = flock()
        lock.l_type = Int16(F_UNLCK)
        lock.l_whence = Int16(SEEK_SET)
        lock.l_start = 0
        lock.l_len = 0
        _ = fcntl(fd, F_SETLK, &lock)
        close(fd)
        fd = -1
    }
}
