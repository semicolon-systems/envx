declare module 'libsodium-wrappers' {
  interface Sodium {
    crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext: unknown,
      nonce: Uint8Array,
      key: Uint8Array,
      associatedData?: Uint8Array,
    ): Uint8Array;
    crypto_aead_xchacha20poly1305_ietf_decrypt(
      secretKey: null,
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array,
      associatedData?: Uint8Array,
    ): Uint8Array;
    crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
    crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
    randombytes_buf(n: number): Uint8Array;
    ready: Promise<void>;
  }
  const sodium: Sodium;
  export default sodium;
}
