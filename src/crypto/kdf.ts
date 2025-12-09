import * as argon2 from 'argon2';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { KdfError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';

type ScryptFn = (password: Buffer, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }) => Promise<Buffer>;
const scrypt: ScryptFn = promisify(scryptCallback) as ScryptFn;

export type Argon2Params = {
  memory: number;
  time: number;
  parallelism: number;
  salt?: Buffer;
};

export type ScryptParams = {
  N: number;
  r: number;
  p: number;
  dkLen: number;
  salt?: Buffer;
};

export type KdfParams = Argon2Params | ScryptParams;

export type KdfMeta = {
  type: 'argon2id' | 'scrypt';
  salt: string;
  params:
    | { memory: number; time: number; parallelism: number }
    | { N: number; r: number; p: number; dkLen: number };
};

export const DEFAULT_ARGON2_PARAMS: Argon2Params = {
  memory: 65536,
  time: 3,
  parallelism: 1,
};

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  dkLen: 32,
};

export const deriveKeyArgon2id = async (
  password: Buffer,
  params: Argon2Params = DEFAULT_ARGON2_PARAMS,
): Promise<{ key: Buffer; salt: Buffer; meta: KdfMeta }> => {
  const salt = params.salt ?? randomBytes(16);
  try {
    const key = await argon2.hash(password, {
      type: argon2.argon2id,
      salt,
      memoryCost: params.memory,
      timeCost: params.time,
      parallelism: params.parallelism,
      hashLength: 32,
      raw: true,
    });
    return {
      key,
      salt,
      meta: {
        type: 'argon2id',
        salt: salt.toString('base64'),
        params: {
          memory: params.memory,
          time: params.time,
          parallelism: params.parallelism,
        },
      },
    };
  } catch (error) {
    throw new KdfError(`Argon2id derivation failed: ${String(error)}`);
  } finally {
    wipeBuffer(params.salt);
  }
};

export const deriveKeyScrypt = async (
  password: Buffer,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<{ key: Buffer; salt: Buffer; meta: KdfMeta }> => {
  const salt = params.salt ?? randomBytes(16);
  try {
    const key = (await scrypt(password, salt, params.dkLen, {
      N: params.N,
      r: params.r,
      p: params.p,
    })) as Buffer;
    return {
      key,
      salt,
      meta: {
        type: 'scrypt',
        salt: salt.toString('base64'),
        params: {
          N: params.N,
          r: params.r,
          p: params.p,
          dkLen: params.dkLen,
        },
      },
    };
  } catch (error) {
    throw new KdfError(`scrypt derivation failed: ${String(error)}`);
  } finally {
    wipeBuffer(params.salt);
  }
};

export const deriveKey = async (
  password: Buffer,
  type: 'argon2id' | 'scrypt',
  params?: Argon2Params | ScryptParams,
): Promise<{ key: Buffer; salt: Buffer; meta: KdfMeta }> => {
  if (type === 'argon2id') {
    return deriveKeyArgon2id(password, params as Argon2Params | undefined);
  }
  return deriveKeyScrypt(password, params as ScryptParams | undefined);
};
