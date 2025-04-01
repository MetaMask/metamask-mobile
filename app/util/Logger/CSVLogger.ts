import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

export interface CSVLogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: string;
}

export class CSVLogger {
  private static readonly CSV_FILE_PATH = Platform.select({
    ios: `${RNFS.DocumentDirectoryPath}/metamask_logs.csv`,
    android: `${RNFS.ExternalDirectoryPath}/metamask_logs.csv`,
  }) as string; // Assert as string since we know this will be defined

  private static readonly CSV_HEADER = 'timestamp,level,message,data\n';

  /**
   * Initialize the CSV file with headers if it doesn't exist
   */
  public static async init(): Promise<void> {
    if (!__DEV__) return;

    try {
      const exists = await RNFS.exists(this.CSV_FILE_PATH);
      if (!exists) {
        await RNFS.writeFile(
          this.CSV_FILE_PATH,
          this.CSV_HEADER,
          'utf8'
        );
      }
    } catch (error) {
      console.error('Failed to initialize CSV log file:', error);
    }
  }

  /**
   * Get the path to the CSV file
   */
    public static getFilePath(): string {
      return this.CSV_FILE_PATH;
    }
  

  /**
   * Write a log entry to the CSV file
   */
  public static async write(entry: CSVLogEntry): Promise<void> {
    if (!__DEV__) return;
    console.log('TEST2', entry)

    const exists = await RNFS.exists(this.CSV_FILE_PATH);
    if (!exists) {
      await RNFS.writeFile(
        this.CSV_FILE_PATH,
        this.CSV_HEADER,
        'utf8'
      );
    }

    try {
      const csvLine = this.formatLogEntry(entry);
      await RNFS.appendFile(this.CSV_FILE_PATH, csvLine, 'utf8');
      console.log('TEST2b', this.CSV_FILE_PATH)
    } catch (error) {
      console.log('TEST2c')
      console.error('Failed to write to CSV log file:', error);
    }
  }

  /**
   * Clear the CSV file and reinitialize with headers
   */
  public static async clear(): Promise<void> {
    if (!__DEV__) return;

    try {
      await RNFS.writeFile(
        this.CSV_FILE_PATH,
        this.CSV_HEADER,
        'utf8'
      );
      console.log('TEST2b')
    } catch (error) {
      console.log('TEST3')
      console.error('Failed to clear CSV log file:', error);
    }
  }


  /**
   * Format a log entry for CSV writing
   */
  private static formatLogEntry(entry: CSVLogEntry): string {
    const escapedMessage = entry.message.replace(/"/g, '""');
    const escapedData = entry.data?.replace(/"/g, '""') || '';

    return `${entry.timestamp},"${entry.level}","${escapedMessage}","${escapedData}"\n`;
  }
}
