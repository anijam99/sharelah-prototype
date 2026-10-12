export interface ZXingReaderModule {
  HEAPU8: Uint8Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  readBarcodesFromPixmap(
    pointer: number,
    width: number,
    height: number,
    options: object,
  ): {
    size(): number;
    get(index: number): { text: string };
    delete(): void;
  };
}
export default function createReader(options: {
  locateFile?: (file: string) => string;
  wasmBinary?: Uint8Array;
}): Promise<ZXingReaderModule>;
