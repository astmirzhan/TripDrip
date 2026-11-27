/** True when the browser can scan QR codes with the camera (BarcodeDetector + getUserMedia). */
export const canScanQr =
  typeof (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector === 'function' && !!navigator.mediaDevices?.getUserMedia
