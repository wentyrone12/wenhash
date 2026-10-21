'use strict';

const ITERATIONS = 600000;
const HASH_RECORD_FORMAT = 'WENHASH-HASH-1';
const DIGEST_RECORD_FORMAT = 'WENHASH-DIGEST-1';
const ENCRYPTION_RECORD_FORMAT = 'WENHASH-ENC-2';
const LEGACY_ENCRYPTION_FORMAT = 'WENHASH-ENC-1';
const isEncFormat = (f) => f === ENCRYPTION_RECORD_FORMAT || f === LEGACY_ENCRYPTION_FORMAT;
const BASE64_RECORD_FORMAT = 'WENHASH-BASE64-1';
const HEX_RECORD_FORMAT = 'WENHASH-HEX-1';
const MAX_TEXT_LENGTH = 20000;
const $ = (id) => document.getElementById(id);

let activeMode = 'hash';
let activePage = 'converter';
let activeReverseTab = 'decrypt';
let currentRecord = null;
let currentOutput = '';
let toastTimeout = null;
let preferences = {
  theme: 'dark',
  accent: '#79e6c2',
  customBase: 'dark',
  density: 'comfortable'
};

const pageTitles = {
  converter: 'CONVERTER',
  reverse: 'DECODE / DECRYPT / VERIFY',
  how: 'HOW IT WORKS',
  purpose: 'PURPOSE & LIMITS',
  about: 'ABOUT WENHASH',
  settings: 'SETTINGS'
};

function getCrypto() {
  if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
    throw new Error('Web Crypto is unavailable. Open WenHash with HTTPS or localhost in a modern browser, for example using VS Code Live Server.');
  }
  return window.crypto;
}

function encodeHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeHex(hex, label = 'hexadecimal value') {
  if (typeof hex !== 'string' || !hex.length || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error(`The ${label} is not valid hexadecimal data.`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToBytes(value, label) {
  if (typeof value !== 'string' || !value.length || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error(`The ${label} field is not valid Base64.`);
  }
  let binary;
  try { binary = atob(value); } catch { throw new Error(`The ${label} field is not valid Base64.`); }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function setNotice(element, message, type = 'success') {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', type === 'error');
  element.hidden = false;
}

function hideNotice(element) {
  if (element) {
    element.hidden = true;
    element.classList.remove('error');
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function updateCharCount() {
  const count = $('sourceText').value.length;
  $('charCount').textContent = `${count.toLocaleString()} character${count === 1 ? '' : 's'}`;
}

function setMode(mode) {
  if (!['hash', 'salted', 'encrypt', 'base64', 'hex'].includes(mode)) return;
  activeMode = mode;
  document.querySelectorAll('.mode-option').forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('hashOptions').hidden = mode !== 'hash';
  $('saltedOptions').hidden = mode !== 'salted';
  $('encryptOptions').hidden = mode !== 'encrypt';
  $('base64Options').hidden = mode !== 'base64';
  $('hexOptions').hidden = mode !== 'hex';
  const labels = {
    hash: `Generate ${$('hashAlgorithm').value} hash`,
    salted: 'Generate salted hash',
    encrypt: 'Encrypt message',
    base64: 'Encode as Base64',
    hex: 'Encode as Hex'
  };
  $('convertBtnText').textContent = labels[mode];
  hideNotice($('convertMessage'));
}

async function digestText(text, algorithm) {
  const encoded = new TextEncoder().encode(text);
  const digest = await getCrypto().subtle.digest(algorithm, encoded);
  return new Uint8Array(digest);
}

async function derivePbkdf2Bytes(passwordOrText, salt, iterations = ITERATIONS) {
  const crypto = getCrypto();
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passwordOrText), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256
  );
  return new Uint8Array(derived);
}

// Layer 1: password -> PBKDF2-SHA-512 (210k) hex. Layer 2: that hash -> PBKDF2-SHA-256 (600k) AES key.
// The raw password is never used directly as key material in ENC-2 records.
async function hardenPassword(password, salt) {
  const c = getCrypto();
  const material = await c.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const tag = new TextEncoder().encode('WH-L1');
  const layerSalt = new Uint8Array(salt.length + tag.length); layerSalt.set(salt); layerSalt.set(tag, salt.length);
  const bits = await c.subtle.deriveBits({ name: 'PBKDF2', salt: layerSalt, iterations: 210000, hash: 'SHA-512' }, material, 512);
  return encodeHex(new Uint8Array(bits));
}

async function deriveEncryptionKey(password, salt, usage, hardened = true) {
  const crypto = getCrypto();
  const secret = hardened ? await hardenPassword(password, salt) : password;
  const passwordMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    passwordMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  );
}

function setResult({ output, label, mode, salt = 'Not used', encryption = 'None', status = 'Generated', record, hint }) {
  currentOutput = output;
  currentRecord = record || null;
  $('outputText').textContent = output;
  $('outputText').classList.remove('empty-output');
  $('outputTypeLabel').textContent = label.toUpperCase();
  $('outputLength').textContent = `${output.length.toLocaleString()} character${output.length === 1 ? '' : 's'}`;
  $('factMode').textContent = mode;
  $('factSalt').textContent = salt;
  $('factEncryption').textContent = encryption;
  $('factStatus').textContent = status;
  $('outputActionHint').textContent = hint;
  $('copyOutput').disabled = false;
  $('copyRecord').disabled = !currentRecord;
  $('downloadRecord').disabled = !currentRecord;
  $('resultState').classList.add('ready');
  $('resultState').innerHTML = '<i></i> GENERATED';
}

function resetResult() {
  currentRecord = null;
  currentOutput = '';
  $('outputText').textContent = 'Your generated output will appear here…';
  $('outputText').classList.add('empty-output');
  $('outputTypeLabel').textContent = 'OUTPUT PREVIEW';
  $('outputLength').textContent = '0 characters';
  $('factMode').textContent = 'Not selected';
  $('factSalt').textContent = 'Not used';
  $('factEncryption').textContent = 'None';
  $('factStatus').textContent = 'Waiting for input';
  $('outputActionHint').textContent = 'Copy the digest or use it for an integrity check.';
  $('copyOutput').disabled = true;
  $('copyRecord').disabled = true;
  $('downloadRecord').disabled = true;
  $('resultState').classList.remove('ready');
  $('resultState').innerHTML = '<i></i> READY';
}

async function convertText() {
  const text = $('sourceText').value;
  const notice = $('convertMessage');
  hideNotice(notice);
  if (!text.length) {
    setNotice(notice, 'Type or paste a message first.', 'error');
    $('sourceText').focus();
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    setNotice(notice, `Input is limited to ${MAX_TEXT_LENGTH.toLocaleString()} characters.`, 'error');
    return;
  }
  const button = $('convertBtn');
  button.disabled = true;
  const originalLabel = activeMode === 'hash' ? `Generate ${$('hashAlgorithm').value} hash` : activeMode === 'salted' ? 'Generate salted hash' : activeMode === 'encrypt' ? 'Encrypt message' : activeMode === 'base64' ? 'Encode as Base64' : 'Encode as Hex';
  $('convertBtnText').textContent = activeMode === 'hash' ? 'Generating digest…' : activeMode === 'salted' ? 'Deriving salted hash…' : activeMode === 'encrypt' ? 'Encrypting locally…' : activeMode === 'base64' ? 'Encoding Base64…' : 'Encoding Hex…';
  try {
    getCrypto();
    if (activeMode === 'hash') {
      const algorithm = $('hashAlgorithm').value;
      const digest = await digestText(text, algorithm);
      const hashHex = encodeHex(digest);
      const record = { format: DIGEST_RECORD_FORMAT, algorithm, hashHex, encoding: 'hex' };
      setResult({
        output: hashHex, label: `${algorithm} digest`, mode: algorithm, salt: 'Not used', encryption: 'None', record,
        hint: 'Copy the digest for an integrity check, or export the small JSON digest record.'
      });
      setNotice(notice, `${algorithm} digest generated. This is one-way output and is not a password-storage format.`);
    } else if (activeMode === 'salted') {
      const salt = getCrypto().getRandomValues(new Uint8Array(16));
      const digest = await derivePbkdf2Bytes(text, salt, ITERATIONS);
      const hashHex = encodeHex(digest);
      const record = {
        format: HASH_RECORD_FORMAT,
        algorithm: 'PBKDF2-HMAC-SHA-256',
        iterations: ITERATIONS,
        keyLengthBits: 256,
        saltHex: encodeHex(salt),
        hashHex,
        encoding: 'hex'
      };
      setResult({
        output: hashHex, label: 'PBKDF2 salted hash', mode: 'PBKDF2-HMAC-SHA-256', salt: 'Random · 16 bytes', encryption: 'None', record,
        hint: 'The digest is shown above. Copy or export the JSON record to keep its salt and verify the candidate text later.'
      });
      setNotice(notice, 'Salted hash generated with a new random salt. The original message is not stored in the exported record. Save the record for verification.');
    } else if (activeMode === 'base64') {
      const encoded = bytesToBase64(new TextEncoder().encode(text));
      const record = { format: BASE64_RECORD_FORMAT, encoding: 'base64', dataBase64: encoded, textEncoding: 'UTF-8' };
      setResult({
        output: encoded, label: 'Base64 encoded text', mode: 'Base64', salt: 'Not used', encryption: 'None · encoding only', record,
        hint: 'Base64 is reversible encoding, not encryption. Use Reverse / Verify → Decode text → Base64 to restore the original message.'
      });
      setNotice(notice, 'Base64 encoding complete. This is reversible encoding for transport/representation, not a security feature.');
    } else if (activeMode === 'hex') {
      const encoded = encodeHex(new TextEncoder().encode(text));
      const record = { format: HEX_RECORD_FORMAT, encoding: 'hex', dataHex: encoded, textEncoding: 'UTF-8' };
      setResult({
        output: encoded, label: 'Hex encoded text', mode: 'Hexadecimal / UTF-8', salt: 'Not used', encryption: 'None · encoding only', record,
        hint: 'Hex is reversible encoding, not encryption. Use Reverse / Verify → Decode text → Hexadecimal to restore the original message.'
      });
      setNotice(notice, 'Hex encoding complete. This is reversible encoding for representation, not a security feature.');
    } else {
      const password = $('encryptPassword').value;
      if (password.length < 12) {
        throw new Error('Use an encryption password with at least 12 characters. A longer, unique passphrase is better.');
      }
      if (password.length > 256) throw new Error('The password cannot exceed 256 characters.');
      const salt = getCrypto().getRandomValues(new Uint8Array(16));
      const iv = getCrypto().getRandomValues(new Uint8Array(12));
      const key = await deriveEncryptionKey(password, salt, 'encrypt');
      const encrypted = await getCrypto().subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 }, key, new TextEncoder().encode(text)
      );
      const record = {
        format: ENCRYPTION_RECORD_FORMAT,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-HMAC-SHA-256',
        passwordHardening: 'PBKDF2-SHA-512x210000 > PBKDF2-SHA-256x600000',
        iterations: ITERATIONS,
        saltBase64: bytesToBase64(salt),
        ivBase64: bytesToBase64(iv),
        ciphertextBase64: bytesToBase64(new Uint8Array(encrypted)),
        encoding: 'base64'
      };
      setResult({
        output: JSON.stringify(record, null, 2), label: 'AES-256-GCM encrypted JSON', mode: 'AES-256-GCM', salt: 'Random · 16 bytes', encryption: 'AES-256-GCM', record,
        hint: 'Keep this encrypted JSON record and store its password separately. Use Reverse / Verify to decrypt it.'
      });
      setNotice(notice, 'Message encrypted locally with double password hashing. Save the JSON record and keep its password separate. WenHash cannot recover a lost password.');
    }
  } catch (error) {
    setNotice(notice, error instanceof Error ? error.message : 'Transformation failed. Try again using a modern browser on HTTPS or localhost.', 'error');
  } finally {
    button.disabled = false;
    $('convertBtnText').textContent = originalLabel;
  }
}

async function decodeToText() {
  const notice = $('decodeMessage');
  hideNotice(notice);
  $('decodedOutput').value = '';
  $('copyDecoded').disabled = true;
  const rawInput = $('decodeInput').value.trim();
  const format = $('decodeFormat').value;
  if (!rawInput) {
    setNotice(notice, 'Paste Base64/Hex output or a saved WenHash record first.', 'error');
    $('decodeInput').focus();
    return;
  }
  if (rawInput.length > 200000) {
    setNotice(notice, 'Input is too large to decode.', 'error');
    return;
  }
  try {
    let source = rawInput;
    let selectedFormat = format;
    if (rawInput.startsWith('{')) {
      let record;
      try { record = JSON.parse(rawInput); } catch { throw new Error('This looks like JSON but it is not valid JSON.'); }
      if (record && isEncFormat(record.format)) {
        $('decryptRecordInput').value = rawInput;
        selectReverseTab('decrypt');
        setNotice($('decryptMessage'), 'Encrypted WenHash record detected. Enter the original password above to decrypt it.');
        setNotice(notice, 'Encrypted record detected. Switched to Decrypt—enter its original password there.');
        return;
      }
      if (record && [HASH_RECORD_FORMAT, DIGEST_RECORD_FORMAT].includes(record.format)) {
        $('hashRecordInput').value = rawInput;
        selectReverseTab('verify');
        setNotice($('verifyMessage'), 'This is a one-way hash record, not reversible text. Enter the candidate original text below to check it.', 'error');
        setNotice(notice, 'Hash record detected. Switched to Verify hash; enter the candidate original text to check it.', 'error');
        return;
      }
      if (record && record.format === BASE64_RECORD_FORMAT && typeof record.dataBase64 === 'string') {
        source = record.dataBase64;
        selectedFormat = 'base64';
      } else if (record && record.format === HEX_RECORD_FORMAT && typeof record.dataHex === 'string') {
        source = record.dataHex;
        selectedFormat = 'hex';
      } else if (record && record.format) {
        throw new Error('Unsupported WenHash record. For encrypted records use Decrypt; for hash records use Verify hash.');
      } else {
        throw new Error('Choose Base64/Hex raw output or paste a supported WenHash JSON record.');
      }
    }

    let bytes;
    if (selectedFormat === 'base64') {
      bytes = base64ToBytes(source, 'encoded input');
    } else {
      bytes = decodeHex(source, 'encoded input');
    }
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('This output does not decode into valid UTF-8 text. Confirm that you selected the correct format and pasted the complete Base64/Hex output. Hash digests and salts are not text encodings.');
    }
    $('decodedOutput').value = text;
    $('copyDecoded').disabled = false;
    setNotice(notice, `Decoded successfully from ${selectedFormat === 'base64' ? 'Base64' : 'Hexadecimal'}. This works for reversible encoding, not for cryptographic hashes or salt values.`);
  } catch (error) {
    setNotice(notice, error instanceof Error ? error.message : 'Could not decode this input.', 'error');
  }
}

function clearDecodeFields() {
  $('decodeInput').value = '';
  $('decodedOutput').value = '';
  $('copyDecoded').disabled = true;
  hideNotice($('decodeMessage'));
}

function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function verifyCandidate() {
  const notice = $('verifyMessage');
  hideNotice(notice);
  const text = $('candidateText').value;
  const input = $('hashRecordInput').value.trim();
  if (!text.length) { setNotice(notice, 'Enter the candidate original text first.', 'error'); $('candidateText').focus(); return; }
  if (!input) { setNotice(notice, 'Paste a SHA digest or WenHash hash record first.', 'error'); $('hashRecordInput').focus(); return; }
  if (text.length > MAX_TEXT_LENGTH || input.length > 100000) { setNotice(notice, 'The candidate text or hash record is too large.', 'error'); return; }
  const button = $('verifyBtn');
  button.disabled = true;
  button.querySelector('span:nth-child(2)').textContent = 'Verifying…';
  try {
    getCrypto();
    let parsed = null;
    if (input.startsWith('{')) {
      try { parsed = JSON.parse(input); } catch { throw new Error('The record starts like JSON but is not valid JSON.'); }
    }
    if (parsed && parsed.format === HASH_RECORD_FORMAT) {
      if (parsed.algorithm !== 'PBKDF2-HMAC-SHA-256' || parsed.iterations !== ITERATIONS || parsed.keyLengthBits !== 256 || parsed.encoding !== 'hex') {
        throw new Error('Unsupported hash record parameters. Use a WenHash salted-hash JSON export.');
      }
      const salt = decodeHex(parsed.saltHex, 'salt');
      const expected = decodeHex(parsed.hashHex, 'hash');
      if (salt.length !== 16 || expected.length !== 32) throw new Error('The salt or hash has an invalid length.');
      button.querySelector('span:nth-child(2)').textContent = 'Deriving hash…';
      const actual = await derivePbkdf2Bytes(text, salt, parsed.iterations);
      if (timingSafeEqual(actual, expected)) setNotice(notice, 'MATCH — the candidate text matches this saved salted-hash record.');
      else setNotice(notice, 'NO MATCH — the candidate text does not match this saved record.', 'error');
    } else {
      let algorithm;
      let expectedHex;
      if (parsed && parsed.format === DIGEST_RECORD_FORMAT) {
        if (!['SHA-256', 'SHA-384', 'SHA-512'].includes(parsed.algorithm) || parsed.encoding !== 'hex') throw new Error('Unsupported SHA digest record.');
        algorithm = parsed.algorithm;
        expectedHex = parsed.hashHex;
      } else if (parsed) {
        throw new Error('This is not a supported WenHash hash record. An encrypted record can be decrypted from the Decrypt tab.');
      } else {
        algorithm = $('verifyAlgorithm').value;
        expectedHex = input;
      }
      const expected = decodeHex(expectedHex, 'expected digest');
      const expectedLength = algorithm === 'SHA-256' ? 32 : algorithm === 'SHA-384' ? 48 : 64;
      if (expected.length !== expectedLength) throw new Error(`The digest length does not match ${algorithm}.`);
      const actual = await digestText(text, algorithm);
      if (timingSafeEqual(actual, expected)) setNotice(notice, `MATCH — the candidate text produces the same ${algorithm} digest.`);
      else setNotice(notice, 'NO MATCH — the candidate text produces a different digest.', 'error');
    }
  } catch (error) {
    setNotice(notice, error instanceof Error ? error.message : 'Could not verify this candidate.', 'error');
  } finally {
    button.disabled = false;
    button.querySelector('span:nth-child(2)').textContent = 'Verify candidate';
  }
}

async function decryptRecord() {
  const notice = $('decryptMessage');
  hideNotice(notice);
  $('decryptedOutput').value = '';
  const rawRecord = $('decryptRecordInput').value.trim();
  const password = $('decryptPassword').value;
  if (!rawRecord) { setNotice(notice, 'Paste the complete encrypted JSON record first.', 'error'); $('decryptRecordInput').focus(); return; }
  if (rawRecord.length > 200000) { setNotice(notice, 'This encrypted record is too large.', 'error'); return; }
  if (!password) { setNotice(notice, 'Enter the password used to encrypt this record.', 'error'); $('decryptPassword').focus(); return; }
  const button = $('decryptBtn');
  button.disabled = true;
  button.querySelector('span:nth-child(2)').textContent = 'Checking record…';
  try {
    const crypto = getCrypto();
    let record;
    try { record = JSON.parse(rawRecord); } catch { throw new Error('The record is not valid JSON. Paste the complete WenHash encrypted JSON.'); }
    if (!record || !isEncFormat(record.format) || record.algorithm !== 'AES-256-GCM' || record.keyDerivation !== 'PBKDF2-HMAC-SHA-256' || record.iterations !== ITERATIONS || record.encoding !== 'base64') {
      throw new Error('Unsupported or modified metadata. Use a WenHash AES-256-GCM export.');
    }
    const salt = base64ToBytes(record.saltBase64, 'salt');
    const iv = base64ToBytes(record.ivBase64, 'IV');
    const ciphertext = base64ToBytes(record.ciphertextBase64, 'ciphertext');
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > 150000) {
      throw new Error('The record has an invalid salt, IV, or ciphertext size.');
    }
    button.querySelector('span:nth-child(2)').textContent = 'Deriving key…';
    const key = await deriveEncryptionKey(password, salt, 'decrypt', record.format === ENCRYPTION_RECORD_FORMAT);
    button.querySelector('span:nth-child(2)').textContent = 'Decrypting…';
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ciphertext);
    const plaintext = new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
    $('decryptedOutput').value = plaintext;
    $('copyDecrypted').disabled = false;
    setNotice(notice, 'DECRYPTION SUCCESSFUL — the password was correct and the encrypted record passed its authentication check.');
  } catch (error) {
    if (error && (error.name === 'OperationError' || error.name === 'DataError')) {
      setNotice(notice, 'DECRYPTION FAILED — the password may be incorrect, or the record may have been changed or corrupted.', 'error');
    } else {
      setNotice(notice, error instanceof Error ? error.message : 'Decryption failed. Check the password and record.', 'error');
    }
  } finally {
    button.disabled = false;
    button.querySelector('span:nth-child(2)').textContent = 'Unlock & decrypt';
  }
}

async function copyText(text, successMessage) {
  if (!text) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed'; helper.style.opacity = '0'; helper.style.pointerEvents = 'none';
      document.body.appendChild(helper); helper.select();
      const copied = document.execCommand('copy'); helper.remove();
      if (!copied) throw new Error('Copy command failed');
    }
    showToast(successMessage);
  } catch {
    showToast('Clipboard access was blocked. Select the text and copy it manually.');
  }
}

function downloadTextFile(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Export ready. Keep passwords separate from encrypted records.');
}

function exportCurrentRecord() {
  if (!currentRecord) return;
  const suffix = isEncFormat(currentRecord.format) ? 'encrypted' : currentRecord.format === HASH_RECORD_FORMAT ? 'salted-hash' : currentRecord.format === BASE64_RECORD_FORMAT ? 'base64' : currentRecord.format === HEX_RECORD_FORMAT ? 'hex' : 'digest';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  downloadTextFile(`wenhash-${suffix}-${timestamp}.json`, JSON.stringify(currentRecord, null, 2));
}

function selectReverseTab(tab) {
  activeReverseTab = tab;
  document.querySelectorAll('[data-reverse-tab]').forEach((button) => {
    const selected = button.dataset.reverseTab === tab;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  document.querySelectorAll('[data-reverse-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.reversePanel !== tab;
  });
  if (tab === 'verify') $('candidateText').focus({ preventScroll: true });
  if (tab === 'decode') $('decodeInput').focus({ preventScroll: true });
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarBackdrop').classList.remove('open');
  $('menuToggle').setAttribute('aria-expanded', 'false');
  $('menuToggle').setAttribute('aria-label', 'Open navigation');
  document.body.classList.remove('nav-open');
}

function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarBackdrop').classList.add('open');
  $('menuToggle').setAttribute('aria-expanded', 'true');
  $('menuToggle').setAttribute('aria-label', 'Close navigation');
  document.body.classList.add('nav-open');
}

function navigateTo(page) {
  if (page === 'verify') {
    showPage('reverse');
    selectReverseTab('verify');
    return;
  }
  showPage(page);
}

function showPage(page) {
  if (!pageTitles[page]) return;
  activePage = page;
  document.querySelectorAll('[data-view]').forEach((view) => {
    const active = view.dataset.view === page;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  document.querySelectorAll('.nav-item[data-page]').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === page);
  });
  $('breadcrumbPage').textContent = pageTitles[page];
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hexToRgb(hex) {
  const valid = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!valid) return [121, 230, 194];
  return [parseInt(valid[1], 16), parseInt(valid[2], 16), parseInt(valid[3], 16)];
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem('wenhash-preferences-v2');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && ['dark', 'light', 'custom'].includes(saved.theme)) preferences.theme = saved.theme;
      if (saved && /^#[0-9a-f]{6}$/i.test(saved.accent || '')) preferences.accent = saved.accent;
      if (saved && ['dark', 'light'].includes(saved.customBase)) preferences.customBase = saved.customBase;
      if (saved && ['comfortable', 'compact'].includes(saved.density)) preferences.density = saved.density;
    } else {
      // Migrate theme preference from the older WenHash version if it exists.
      const olderTheme = localStorage.getItem('wenhash-theme');
      if (olderTheme === 'light') preferences.theme = 'light';
    }
  } catch { /* Preferences are optional; sensible defaults remain in use. */ }
}

function savePreferences() {
  try {
    localStorage.setItem('wenhash-preferences-v2', JSON.stringify(preferences));
    $('settingsSaveState').innerHTML = '<i></i> Preferences saved on this device';
  } catch {
    $('settingsSaveState').textContent = 'Browser storage unavailable; settings may reset when you leave.';
  }
}

function syncSettingsControls() {
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.classList.toggle('active', button.dataset.themeChoice === preferences.theme));
  document.querySelectorAll('[data-density]').forEach((button) => button.classList.toggle('active', button.dataset.density === preferences.density));
  $('customAppearance').hidden = preferences.theme !== 'custom';
  $('accentColor').value = preferences.accent;
  $('accentHex').textContent = preferences.accent.toUpperCase();
  $('customBase').value = preferences.customBase;
  $('currentThemeLabel').textContent = preferences.theme === 'custom' ? `Custom · ${preferences.customBase}` : preferences.theme[0].toUpperCase() + preferences.theme.slice(1);
  $('currentDensityLabel').textContent = preferences.density[0].toUpperCase() + preferences.density.slice(1);
}

function applyPreferences() {
  document.body.classList.remove('light-theme', 'custom-theme', 'base-light', 'base-dark', 'density-compact');
  if (preferences.theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (preferences.theme === 'custom') {
    document.body.classList.add('custom-theme', preferences.customBase === 'light' ? 'base-light' : 'base-dark');
    const [r, g, b] = hexToRgb(preferences.accent);
    const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    document.body.style.setProperty('--custom-accent', preferences.accent);
    document.body.style.setProperty('--custom-accent-rgb', `${r}, ${g}, ${b}`);
    document.body.style.setProperty('--custom-ink', brightness > 0.56 ? '#061710' : '#ffffff');
  } else {
    document.body.style.removeProperty('--custom-accent');
    document.body.style.removeProperty('--custom-accent-rgb');
    document.body.style.removeProperty('--custom-ink');
  }
  if (preferences.density === 'compact') document.body.classList.add('density-compact');
  $('quickThemeToggle').textContent = (preferences.theme === 'light' || (preferences.theme === 'custom' && preferences.customBase === 'light')) ? '☾' : '☼';
  $('quickThemeToggle').setAttribute('aria-label', (preferences.theme === 'light' || (preferences.theme === 'custom' && preferences.customBase === 'light')) ? 'Switch to dark theme' : 'Switch to light theme');
  syncSettingsControls();
}

function updateAndSavePreferences() {
  applyPreferences();
  savePreferences();
}

function quickToggleTheme() {
  const currentlyLight = preferences.theme === 'light' || (preferences.theme === 'custom' && preferences.customBase === 'light');
  preferences.theme = currentlyLight ? 'dark' : 'light';
  updateAndSavePreferences();
  showToast(`Theme changed to ${preferences.theme}.`);
}

function resetPreferences() {
  preferences = { theme: 'dark', accent: '#79e6c2', customBase: 'dark', density: 'comfortable' };
  updateAndSavePreferences();
  showToast('Appearance preferences reset.');
}

function clearDecryptFields() {
  $('decryptRecordInput').value = '';
  $('decryptPassword').value = '';
  $('decryptedOutput').value = '';
  $('copyDecrypted').disabled = true;
  hideNotice($('decryptMessage'));
}

function bindEvents() {
  $('sourceText').addEventListener('input', updateCharCount);
  $('clearText').addEventListener('click', () => {
    $('sourceText').value = ''; $('encryptPassword').value = '';
    updateCharCount(); resetResult(); hideNotice($('convertMessage')); $('sourceText').focus();
  });
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('hashAlgorithm').addEventListener('change', () => { if (activeMode === 'hash') $('convertBtnText').textContent = `Generate ${$('hashAlgorithm').value} hash`; });
  $('convertBtn').addEventListener('click', convertText);
  $('copyOutput').addEventListener('click', () => copyText(currentOutput, 'Output copied to clipboard.'));
  $('copyRecord').addEventListener('click', () => {
    if (currentRecord) copyText(JSON.stringify(currentRecord, null, 2), 'Complete JSON record copied.');
  });
  $('downloadRecord').addEventListener('click', exportCurrentRecord);
  $('decryptBtn').addEventListener('click', decryptRecord);
  $('verifyBtn').addEventListener('click', verifyCandidate);
  $('decodeBtn').addEventListener('click', decodeToText);
  $('copyDecoded').addEventListener('click', () => copyText($('decodedOutput').value, 'Translated text copied to clipboard.'));
  $('clearDecode').addEventListener('click', clearDecodeFields);
  $('copyDecrypted').addEventListener('click', () => copyText($('decryptedOutput').value, 'Recovered text copied to clipboard.'));
  $('clearDecrypt').addEventListener('click', clearDecryptFields);
  document.querySelectorAll('[data-reverse-tab]').forEach((button) => button.addEventListener('click', () => selectReverseTab(button.dataset.reverseTab)));
  document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.page)));
  $('menuToggle').addEventListener('click', () => $('sidebar').classList.contains('open') ? closeSidebar() : openSidebar());
  $('sidebarBackdrop').addEventListener('click', closeSidebar);
  $('quickThemeToggle').addEventListener('click', quickToggleTheme);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 960) closeSidebar(); });
  document.querySelectorAll('[data-password-target]').forEach((button) => button.addEventListener('click', () => {
    const input = $(button.dataset.passwordTarget);
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Hide' : 'Show';
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  }));
  document.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => {
    preferences.theme = button.dataset.themeChoice;
    updateAndSavePreferences();
  }));
  $('accentColor').addEventListener('input', () => {
    preferences.accent = $('accentColor').value;
    $('accentHex').textContent = preferences.accent.toUpperCase();
    if (preferences.theme === 'custom') applyPreferences();
    savePreferences();
  });
  $('customBase').addEventListener('change', () => { preferences.customBase = $('customBase').value; updateAndSavePreferences(); });
  document.querySelectorAll('[data-density]').forEach((button) => button.addEventListener('click', () => {
    preferences.density = button.dataset.density;
    updateAndSavePreferences();
  }));
  $('resetSettings').addEventListener('click', resetPreferences);
}

function init() {
  loadPreferences();
  applyPreferences();
  bindEvents();
  updateCharCount();
  setMode('hash');
  resetResult();
  selectReverseTab('decode');
}

init();
