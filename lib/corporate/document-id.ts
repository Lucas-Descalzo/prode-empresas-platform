const DOCUMENT_ID_PATTERN = /^\d{7,8}$/;

export function sanitizeDocumentIdInput(value: string) {
  return value.replace(/\D+/g, "").slice(0, 8);
}

export function normalizeDocumentId(value: string) {
  const trimmed = value.trim();
  return DOCUMENT_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function isValidDocumentId(value: string) {
  return normalizeDocumentId(value) !== null;
}
