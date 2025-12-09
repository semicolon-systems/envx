import { Buffer } from 'node:buffer';

export const wipeBuffer = (buf: Uint8Array | undefined | null): void => {
  if (!buf) return;
  buf.fill(0);
};

export const wipeBuffers = (buffers: Array<Uint8Array | undefined | null>): void => {
  for (const buf of buffers) {
    wipeBuffer(buf);
  }
};

export const toBuffer = (value: string): Buffer => Buffer.from(value, 'utf8');

export const wipeRecord = (record: Record<string, Buffer>): void => {
  for (const key of Object.keys(record)) {
    wipeBuffer(record[key]);
    delete record[key];
  }
};
