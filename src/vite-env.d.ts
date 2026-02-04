/// <reference types="vite/client" />

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FilePickerOptions = {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
};

type FileSystemPermissionDescriptor = {
  mode?: 'read' | 'readwrite';
};

interface FileSystemHandle {
  name: string;
  queryPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>;
}

interface FileSystemWritableFileStream {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface Window {
  showSaveFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (
    options?: FilePickerOptions & { multiple?: boolean }
  ) => Promise<FileSystemFileHandle[]>;
}
