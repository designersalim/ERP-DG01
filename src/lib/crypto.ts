/**
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Computes the SHA-256 hash of a string using the browser's native SubtleCrypto API.
 * This ensures highly secure password processing without external packages.
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
