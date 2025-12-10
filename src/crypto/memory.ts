/**
 * Memory safety utilities for wiping sensitive buffers.
 * Clears buffer contents before garbage collection to prevent data leaks.
 */

/**
 * Securely wipes a buffer by filling it with zeros.
 * @param buffer - The buffer to wipe.
 */
export function wipeBuffer(buffer: Buffer): void {
  buffer.fill(0);
}
