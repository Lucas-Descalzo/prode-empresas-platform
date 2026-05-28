import { describe, expect, it } from "vitest";

import {
  isValidDocumentId,
  normalizeDocumentId,
  sanitizeDocumentIdInput,
} from "@/lib/corporate/document-id";

describe("corporate document id helpers", () => {
  it("accepts only 7 or 8 numeric digits", () => {
    expect(isValidDocumentId("1234567")).toBe(true);
    expect(isValidDocumentId("12345678")).toBe(true);
    expect(isValidDocumentId("123456")).toBe(false);
    expect(isValidDocumentId("123456789")).toBe(false);
    expect(isValidDocumentId("12.345.678")).toBe(false);
    expect(isValidDocumentId("12 345 678")).toBe(false);
    expect(isValidDocumentId("abc12345")).toBe(false);
  });

  it("normalizes only valid strict values", () => {
    expect(normalizeDocumentId("12345678")).toBe("12345678");
    expect(normalizeDocumentId(" 12345678 ")).toBe("12345678");
    expect(normalizeDocumentId("12.345.678")).toBeNull();
  });

  it("sanitizes interactive input to digits and max length", () => {
    expect(sanitizeDocumentIdInput("12.345.678")).toBe("12345678");
    expect(sanitizeDocumentIdInput("12 34ab56789")).toBe("12345678");
  });
});
