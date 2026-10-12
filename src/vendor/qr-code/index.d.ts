export default class QRCode {
  constructor(typeNumber: number, errorCorrectionLevel: number);
  addData(text: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
}
