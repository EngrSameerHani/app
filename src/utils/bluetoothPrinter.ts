// Web Bluetooth API Integration for ESC/POS Thermal Receipt Printers (Android & Chrome)
// Supports PT-210, MPT-II, XP-58, POS-5802, Goojprt, Milestone, Rongta, etc.

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

// Well-known Bluetooth LE Printer Service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Rongta / Goojprt
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic SPP / POS Service
  '0000af30-0000-1000-8000-00805f9b34fb', // Zjiang / MPT-II
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Cat / PeriPage Printer
];

// Characteristics UUIDs for write commands
const WRITE_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c1-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000af31-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
];

class BluetoothThermalPrinterService {
  private device: any = null;
  private gattServer: any = null;
  private writeCharacteristic: any = null;
  private connectedPrinterName: string | null = null;
  private listeners: Array<(status: { connected: boolean; deviceName: string | null }) => void> = [];

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getConnectedDeviceName(): string | null {
    return this.connectedPrinterName;
  }

  public isConnected(): boolean {
    return !!(this.gattServer && this.gattServer.connected && this.writeCharacteristic);
  }

  public subscribe(listener: (status: { connected: boolean; deviceName: string | null }) => void) {
    this.listeners.push(listener);
    listener({ connected: this.isConnected(), deviceName: this.connectedPrinterName });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const status = { connected: this.isConnected(), deviceName: this.connectedPrinterName };
    this.listeners.forEach((l) => l(status));
  }

  public async connect(): Promise<string> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Bluetooth is not supported on this browser. On Android, please use Google Chrome or install the app.'
      );
    }

    try {
      // Request device with printer services or acceptAllDevices
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'MPT' },
          { namePrefix: 'POS' },
          { namePrefix: 'PT-' },
          { namePrefix: 'XP-' },
          { namePrefix: 'Printer' },
          { namePrefix: 'RP' },
          { namePrefix: 'BlueTooth' },
        ],
        optionalServices: PRINTER_SERVICES,
      }).catch(async () => {
        // Fallback: accept all Bluetooth devices
        return await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICES,
        });
      });

      this.device = device;
      this.connectedPrinterName = device.name || 'Bluetooth POS Printer';

      device.addEventListener('gattserverdisconnected', () => {
        this.writeCharacteristic = null;
        this.gattServer = null;
        this.connectedPrinterName = null;
        this.notify();
      });

      const server = await device.gatt.connect();
      this.gattServer = server;

      // Find suitable service and write characteristic
      let foundChar = null;

      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          if (service) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundChar = char;
                break;
              }
            }
          }
        } catch {
          // Continue searching other services
        }
        if (foundChar) break;
      }

      if (!foundChar) {
        // Try searching all primary services if permitted
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundChar = char;
                break;
              }
            }
            if (foundChar) break;
          }
        } catch (e) {
          console.warn('Could not enumerate services:', e);
        }
      }

      if (!foundChar) {
        throw new Error('Connected to Bluetooth device, but could not locate ESC/POS print write characteristic.');
      }

      this.writeCharacteristic = foundChar;
      this.notify();
      return this.connectedPrinterName || 'Bluetooth Thermal Printer';
    } catch (err: any) {
      this.notify();
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.gattServer && this.gattServer.connected) {
      try {
        await this.gattServer.disconnect();
      } catch (e) {
        console.warn('Error disconnecting bluetooth printer:', e);
      }
    }
    this.writeCharacteristic = null;
    this.gattServer = null;
    this.connectedPrinterName = null;
    this.notify();
  }

  // Send raw ESC/POS binary bytes to the printer in safe MTU chunks
  public async printRaw(data: Uint8Array): Promise<void> {
    if (!this.isConnected() || !this.writeCharacteristic) {
      throw new Error('No Bluetooth printer connected. Please pair your Bluetooth thermal printer first.');
    }

    const CHUNK_SIZE = 64; // Safe chunk size for BLE thermal printers
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      if (this.writeCharacteristic.writeValueWithResponse) {
        await this.writeCharacteristic.writeValueWithResponse(chunk);
      } else if (this.writeCharacteristic.writeValueWithoutResponse) {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        await delay(25);
      } else {
        await this.writeCharacteristic.writeValue(chunk);
        await delay(25);
      }
    }
  }

  // Print test receipt to verify connection
  public async printTestSlip(storeName: string): Promise<void> {
    const encoder = new TextEncoder();
    const initCmd = new Uint8Array([0x1b, 0x40]); // ESC @
    const alignCenter = new Uint8Array([0x1b, 0x61, 0x01]);
    const boldOn = new Uint8Array([0x1b, 0x45, 0x01]);
    const boldOff = new Uint8Array([0x1b, 0x45, 0x00]);
    const cutCmd = new Uint8Array([0x1d, 0x56, 0x41, 0x03]); // GS V A

    const header = encoder.encode(`\n================================\n   ${storeName.toUpperCase()}\n================================\n`);
    const body = encoder.encode(
      `BLUETOOTH THERMAL PRINTER TEST\nStatus: Connected & Ready\nDate: ${new Date().toLocaleString()}\n` +
      `System: Android / Web POS Suite\n` +
      `--------------------------------\n      PRINTING VERIFIED OK      \n================================\n\n\n\n`
    );

    const fullPayload = new Uint8Array([
      ...initCmd,
      ...alignCenter,
      ...boldOn,
      ...header,
      ...boldOff,
      ...body,
      ...cutCmd,
    ]);

    await this.printRaw(fullPayload);
  }
}

export const bluetoothPrinter = new BluetoothThermalPrinterService();
