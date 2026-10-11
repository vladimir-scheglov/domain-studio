import { pathByOffset } from "@/domain/pathByOffset";
import { getNodeMeta } from "@/domain/schema";
import { findUnknownKeys } from "@/domain/unknownKeys";
import { useDocumentStore } from "@/store/documentStore";
import type * as monaco from "monaco-editor";

const HOVER_DOCS: Record<string, { title: string; description: string }> = {
  id: {
    title: "id",
    description: "Уникальный идентификатор элемента схемы (Data ID).",
  },
  name: {
    title: "name",
    description: "Человекочитаемое название элемента схемы.",
  },
  description: {
    title: "description",
    description: "Описание элемента. Не выводится в представлениях.",
  },
  dataType: {
    title: "dataType",
    description:
      "Тип данных атрибута. Может быть встроенным или ссылкой на пользовательский тип.",
  },
  entities: {
    title: "entities",
    description: "Массив сущностей домена.",
  },
  linkages: {
    title: "linkages",
    description: "Массив связей между сущностями.",
  },
  views: {
    title: "views",
    description: "Массив представлений (списки, карточки, модальные окна).",
  },
  actions: {
    title: "actions",
    description: "Массив действий над сущностями.",
  },
  dataRules: {
    title: "dataRules",
    description:
      "Правила данных — выражения, ограничивающие операции с атрибутами.",
  },
};

export function registerHoverProvider(
  monacoApi: typeof import("monaco-editor"),
): monaco.IDisposable {
  return monacoApi.languages.registerHoverProvider("yaml", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // 1) попытка найти неизвестный ключ под курсором
      const doc = useDocumentStore.getState().doc;
      if (doc) {
        const offset = model.getOffsetAt(position);
        const path = pathByOffset(doc, offset);
        const parsed = useDocumentStore.getState().parsed;

        if (parsed && path.length > 0) {
          const unknownSet = new Set(
            findUnknownKeys(parsed).map((u) => JSON.stringify(u.path)),
          );

          // последний сегмент — имя ключа, если слово совпадает
          // у нас word.word — это имя, а в path лежит путь до ключа
          const checkPath = [...path];
          if (word.word && checkPath[checkPath.length - 1] === word.word) {
            // ничего, path уже указывает на ключ
          } else {
            checkPath.push(word.word);
          }

          if (unknownSet.has(JSON.stringify(checkPath))) {
            // подбираем ближайшее известное имя
            const parentPath = checkPath.slice(0, -1);
            const parentMeta = getNodeMeta(parentPath);
            if (parentMeta) {
              const suggestion = findClosest(
                word.word,
                parentMeta.fields.map((f) => f.name),
              );
              const contents: monaco.IMarkdownString[] = [
                { value: `**Неизвестное свойство** \`${word.word}\`` },
              ];
              if (suggestion) {
                contents.push({
                  value: `Возможно, вы имели в виду \`${suggestion}\`?`,
                });
              }
              return {
                range: new monacoApi.Range(
                  position.lineNumber,
                  word.startColumn,
                  position.lineNumber,
                  word.endColumn,
                ),
                contents,
              };
            }
          }
        }
      }

      // 2) существующий обработчик известных ключей
      const doc2 = HOVER_DOCS[word.word];
      if (!doc2) return null;

      return {
        range: new monacoApi.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        ),
        contents: [{ value: `**${doc2.title}**` }, { value: doc2.description }],
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/*                    Поиск ближайшего совпадения                      */
/* ------------------------------------------------------------------ */

function findClosest(input: string, options: string[]): string | null {
  if (!input || options.length === 0) return null;

  let best: string | null = null;
  let bestScore = Infinity;

  const lower = input.toLowerCase();
  for (const opt of options) {
    const score = levenshtein(lower, opt.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = opt;
    }
  }

  // порог: слишком далёкие варианты не предлагаем
  if (bestScore > Math.max(2, Math.floor(input.length / 2))) return null;
  return best;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}