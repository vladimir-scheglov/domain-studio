import type * as monaco from "monaco-editor";

/**
 * Monarch-грамматика для RQL.
 * Покрывает: ключевые слова, операторы, функции, псевдонимы @doc/@CurrentUser,
 * строки, числа, комментарии, узел !rql (YAML-тег).
 */
export function registerRqlLanguage(
  monacoApi: typeof import("monaco-editor"),
): monaco.IDisposable[] {
  // Регистрируем язык один раз
  if (!monacoApi.languages.getLanguages().some((l) => l.id === "rql")) {
    monacoApi.languages.register({ id: "rql" });

    monacoApi.languages.setMonarchTokensProvider("rql", {
      defaultToken: "",
      tokenPostfix: ".rql",

      keywords: [
        "SELECT",
        "FROM",
        "WHERE",
        "GROUP",
        "BY",
        "HAVING",
        "ORDER",
        "LIMIT",
        "OFFSET",
        "JOIN",
        "LEFT",
        "RIGHT",
        "INNER",
        "FULL",
        "OUTER",
        "ON",
        "AS",
        "AND",
        "OR",
        "NOT",
        "IN",
        "IS",
        "NULL",
        "BETWEEN",
        "LIKE",
        "ASC",
        "DESC",
        "WITH",
        "FILL",
        "STEP",
        "ENRICH",
        "UNNEST",
        "ARRAY",
        "TSRANGE",
        "CAST",
        "COUNT",
      ],

      systemAliases: [
        "@doc",
        "@row",
        "@index",
        "@CurrentUser",
        "@CurrentDate",
        "@CurrentTime",
        "@CurrentTimestamp",
        "@CurrentDateTime",
        "@CurrentDayOfWeek",
      ],

      operators: ["=", "!=", "<>", "<", "<=", ">", ">=", "+", "-", "*", "/"],

      tokenizer: {
        root: [
            // YAML-тег !rql
            [/!rql\b/, 'keyword.tag'],

            // системные псевдонимы (экранируем @ как \@)
            [/@@CurrentUser|@@CurrentDate|@@CurrentTime|@@CurrentTimestamp|@@CurrentDateTime|@@CurrentDayOfWeek/, 'variable.predefined'],
            [/\@@doc|\@@row|\@@index\b/, 'variable.predefined'],
            [/\@@[A-Za-z_][\w]*/, 'variable'],

            // строки
            [/'[^']*'/, 'string'],
            [/"([^"\\]|\\.)*"/, 'string'],

            // числа
            [/\b\d+(\.\d+)?\b/, 'number'],

            // функции и идентификаторы
            [/\b[A-Za-z_][\w]*\s*(?=\()/, 'function'],
            [/\b(?:SELECT|FROM|WHERE|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|FULL|OUTER|ON|AS|AND|OR|NOT|IN|IS|NULL|BETWEEN|LIKE|ASC|DESC|WITH|FILL|STEP|ENRICH|UNNEST|ARRAY|TSRANGE|CAST|COUNT)\b/, 'keyword'],
            [/\b[A-Za-z_][\w]*\b/, 'identifier'],

            // операторы
            [/[=<>!+\-*/]+/, 'operator'],
            [/[(),]/, 'delimiter'],

            // комментарии
            [/--.*$/, 'comment'],
            [/\/\/.*$/, 'comment'],
        ],
      },
    });

    monacoApi.languages.setLanguageConfiguration("rql", {
      brackets: [
        ["(", ")"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: "(", close: ")" },
        { open: "[", close: "]" },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ],
    });

    monacoApi.editor.defineTheme("rql-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "c586c0", fontStyle: "bold" },
        { token: "keyword.tag", foreground: "4ec9b0" },
        { token: "function", foreground: "dcdcaa" },
        { token: "variable.predefined", foreground: "4fc1ff" },
        { token: "variable", foreground: "9cdcfe" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "delimiter", foreground: "d4d4d4" },
        { token: "comment", foreground: "6a9955", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
      },
    });
  }

  // Провайдер автокомплита
  const completion = monacoApi.languages.registerCompletionItemProvider("rql", {
    triggerCharacters: ["@", ".", " "],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const suggestions: monaco.languages.CompletionItem[] = [];

      const keywords = [
        "SELECT",
        "FROM",
        "WHERE",
        "GROUP BY",
        "HAVING",
        "ORDER BY",
        "LIMIT",
        "OFFSET",
        "AND",
        "OR",
        "NOT",
        "IN",
        "IS NULL",
        "IS NOT NULL",
        "BETWEEN",
        "LIKE",
      ];
      for (const k of keywords) {
        suggestions.push({
          label: k,
          kind: monacoApi.languages.CompletionItemKind.Keyword,
          insertText: k,
          range,
        });
      }

      const functions = [
        "count",
        "sum",
        "avg",
        "max",
        "min",
        "if",
        "multiIf",
        "equals",
        "notEquals",
        "like",
        "not(like(...))",
        "in",
        "notIn",
        "isNull",
        "isNotNull",
        "cast",
        "CAST",
        "ARRAY",
        "UNNEST",
        "TSRANGE",
        "has",
        "hasAll",
        "hasAny",
        "length",
        "DATE_PART",
        "extract",
        "gen_random_uuid",
        "SELECT",
        "with",
        "join",
        "innerJoin",
        "leftJoin",
        "rightJoin",
        "fullJoin",
        "from",
        "where",
        "group",
        "having",
        "order",
        "limit",
      ];
      for (const f of functions) {
        suggestions.push({
          label: f,
          kind: monacoApi.languages.CompletionItemKind.Function,
          insertText: f,
          range,
        });
      }

      const aliases = [
        "@doc",
        "@row",
        "@index",
        "@CurrentUser",
        "@CurrentUser.id",
        "@CurrentUser.username",
        "@CurrentDate",
        "@CurrentTime",
        "@CurrentTimestamp",
        "@CurrentDateTime",
        "@CurrentDayOfWeek",
      ];
      for (const a of aliases) {
        suggestions.push({
          label: a,
          kind: monacoApi.languages.CompletionItemKind.Variable,
          insertText: a,
          detail: "системный псевдоним",
          range,
        });
      }

      return { suggestions };
    },
  });

  return [completion];
}
