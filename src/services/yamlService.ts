import {
  LineCounter,
  parseDocument,
  stringify as yamlStringify,
  type Document,
} from "yaml";
import { registerDocMeta } from "@/domain/findRange";

export type ParseResult = {
  parsed: unknown | null;
  doc: Document.Parsed | null;
  lineCounter: LineCounter;
  error: string | null;
};

export function parseYaml(text: string): ParseResult {
  const lineCounter = new LineCounter();
  try {
    const doc = parseDocument(text, {
      lineCounter,
      keepSourceTokens: true,
    });

    if (doc) {
      registerDocMeta(doc, lineCounter, text);
    }

    const errors = doc.errors;
    if (errors.length > 0) {
      return {
        parsed: doc.toJS(),
        doc,
        lineCounter,
        error: errors[0].message,
      };
    }

    return {
      parsed: doc.toJS(),
      doc,
      lineCounter,
      error: null,
    };
  } catch (e) {
    return {
      parsed: null,
      doc: null,
      lineCounter,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function stringifyYaml(value: unknown): string {
  return yamlStringify(value, { lineWidth: 120 });
}
