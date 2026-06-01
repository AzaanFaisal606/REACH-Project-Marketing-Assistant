// NOT encryption — MV3 has no secure keystore. This is light obfuscation so the
// key isn't sitting in storage as literal plaintext. A local attacker with disk
// access can still recover it. Disclosed honestly in the UI.
const PAD = "reach-extension-obfuscation-pad-v1";

function xor(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ PAD.charCodeAt(i % PAD.length));
  }
  return out;
}

export function obfuscate(plain: string): string {
  return btoa(unescape(encodeURIComponent(xor(plain))));
}

export function deobfuscate(stored: string): string {
  if (!stored) return "";
  return xor(decodeURIComponent(escape(atob(stored))));
}
