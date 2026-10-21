WENHASH — TEXT CRYPTO CONVERTER V2.0
===================================

FILES
- index.html   Application interface and sidebar pages
- styles.css   Responsive layout, sliding mobile sidebar, light/dark/custom themes
- app.js       Hashing, PBKDF2 salted hashing, AES-GCM encryption/decryption, verification, local preferences

HOW TO RUN (WINDOWS / VS CODE)
1. Extract the ZIP archive.
2. Open the wenhash_system folder in VS Code.
3. Recommended: install/use the VS Code Live Server extension, right-click index.html, choose "Open with Live Server".
   Alternatively, open PowerShell in this folder and run:
       py -m http.server 8000
   Then visit http://localhost:8000 in your browser.
4. Web Crypto requires a modern browser and a secure context such as HTTPS or localhost.

CONVERTER MODES
1. HASH: SHA-256, SHA-384, or SHA-512. Same text produces the same digest.
2. HASH + SALT: PBKDF2-HMAC-SHA-256 with 600,000 iterations and a fresh random 16-byte salt. This mode is one-way. Save the JSON record because the salt is needed to verify it later.
3. ENCRYPT: AES-256-GCM with a password-derived key using PBKDF2-HMAC-SHA-256 (600,000 iterations), a fresh random 16-byte salt, and a fresh random 12-byte IV. A password of at least 12 characters is required by the UI.

REVERSE / VERIFY
- Decrypt encrypted data: paste a complete WENHASH-ENC-1 JSON record and enter the correct password. Decryption succeeds only when the password and authenticated record are correct.
- Verify a hash: enter a candidate text and paste either a raw SHA digest, a WENHASH-DIGEST-1 JSON record, or a WENHASH-HASH-1 salted hash record.
- Salt only: a salt is not an encoded message and does not contain the original text. It cannot be converted back to plaintext.
- Hash only: a hash is not encryption and does not contain a reversible representation of the original text. Use candidate verification, not “hash to text”.

SECURITY NOTES
- Uses the browser Web Crypto API and does not include a server-upload endpoint or third-party crypto library.
- The salt and IV are not secret. They are stored in the corresponding records; keep passwords separate from encrypted records.
- A weak password can still be guessed offline if an attacker obtains its ciphertext. Use a strong, unique passphrase.
- Browser local storage is used only for appearance preferences, not plaintext, encryption passwords, or records.
- This is an educational local-browser project, not an independently audited security product. It cannot protect inputs from a compromised device, malicious browser extensions, clipboard monitoring, or someone who can access the running browser.
- Do not use as the sole protection for high-value secrets or production accounts. Have important systems independently reviewed.


WENHASH V2.1 — TEXT TRANSLATOR + CRYPTO CONVERTER

New in V2.1:
- Base64 and Hex text encoding modes. These are reversible encodings, not encryption.
- Decode text panel inside the same system. Paste Base64/Hex output or the JSON record and translate it back to UTF-8 text.
- Encrypted WenHash JSON pasted into Decode Text is detected and routed to Decrypt; a hash record is detected and routed to Verify.
- Clear notices distinguish reversible encoding from one-way hashes and salts.
- Mobile-responsive transformation cards and decode tabs.

How to translate back:
1. Use Base64 or Hex mode in Converter, then copy the output.
2. Open Reverse / Verify > Decode text.
3. Select the same format and paste the output (or use the exported JSON record).
4. Click Decode to text.

For AES encryption, use Reverse / Verify > Decrypt and enter the exact password.
For SHA/PBKDF2 hashes, the app cannot recover the original. Use Verify hash with a candidate original text. Salt alone is a random value and cannot reconstruct the message.


WENHASH V2.2 — ENHANCED
- Double password hashing: password -> PBKDF2-SHA-512 (210k) -> hex -> PBKDF2-SHA-256 (600k) -> AES-256-GCM key. New records use format WENHASH-ENC-2. Old WENHASH-ENC-1 records still decrypt.
- Mobile: bottom nav bar, 16px inputs (no iOS zoom), 46px touch targets, safe-area support, sticky topbar.
- Settings: font style (7 fonts), text size (S/M/L/XL), language (English/Filipino/Español), Assistive Touch, pop-up results, loading effects, privacy shield.
- Assistive Touch: draggable floating logo, snaps to edges, stays on every screen and on browser Back, hidden only by Exit.
- Loaders and pop-ups: boot splash, busy overlay, result dialogs, exit confirmation + lock screen.
- Privacy shield: blur on tab switch, clear passwords after idle, autofill/password-manager hints disabled on fields.
New files: enhance.css, enhance.js. Fonts load from Google Fonts (needs internet; falls back to system fonts offline).
