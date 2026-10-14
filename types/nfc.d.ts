interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: string | BufferSource;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      mediaType?: string;
      id?: string;
      data?: DataView;
      encoding?: string;
    }>;
  };
}

interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: NDEFMessageInit | string, options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(
    type: "reading" | "readingerror",
    listener: (event: NDEFReadingEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: "reading" | "readingerror",
    listener: (event: NDEFReadingEvent) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface NDEFReaderConstructor {
  new (): NDEFReader;
}

interface Window {
  NDEFReader?: NDEFReaderConstructor;
}
