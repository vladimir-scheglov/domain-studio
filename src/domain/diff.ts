import { diffLines } from "diff";

export type DiffOp = "unchanged" | "added" | "removed";

export type DiffLine = {
  op: DiffOp;
  content: string;
  /** Номер строки в левом файле (null, если строка добавлена). */
  leftLine: number | null;
  /** Номер строки в правом файле (null, если строка удалена). */
  rightLine: number | null;
};

export type DiffStats = {
  added: number;
  removed: number;
  unchanged: number;
};

export type DiffResult = {
  lines: DiffLine[];
  stats: DiffStats;
};

/**
 * Вычисляет построчный diff двух YAML-документов.
 */
export function computeDiff(left: string, right: string): DiffResult {
  const changes = diffLines(left, right);

  const lines: DiffLine[] = [];
  let leftNum = 1;
  let rightNum = 1;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (const change of changes) {
    // разбиваем на строки; последний пустой (если значение кончается \n)
    const parts = change.value.split("\n");
    if (change.value.endsWith("\n")) parts.pop();

    for (const content of parts) {
      if (change.added) {
        lines.push({
          op: "added",
          content,
          leftLine: null,
          rightLine: rightNum++,
        });
        added++;
      } else if (change.removed) {
        lines.push({
          op: "removed",
          content,
          leftLine: leftNum++,
          rightLine: null,
        });
        removed++;
      } else {
        lines.push({
          op: "unchanged",
          content,
          leftLine: leftNum++,
          rightLine: rightNum++,
        });
        unchanged++;
      }
    }
  }

  return { lines, stats: { added, removed, unchanged } };
}

/**
 * Возвращает только строки с изменениями плюс N контекстных строк вокруг.
 */
export function filterWithContext(
  lines: DiffLine[],
  contextLines: number = 3,
): DiffLine[] {
  if (contextLines < 0) return lines;

  const keep = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].op !== "unchanged") {
      for (
        let j = Math.max(0, i - contextLines);
        j <= Math.min(lines.length - 1, i + contextLines);
        j++
      ) {
        keep.add(j);
      }
    }
  }

  const result: DiffLine[] = [];
  let lastKept = -2;
  for (let i = 0; i < lines.length; i++) {
    if (keep.has(i)) {
      if (lastKept !== -2 && i - lastKept > 1) {
        // маркер разрыва
        result.push({
          op: "unchanged",
          content: "...",
          leftLine: null,
          rightLine: null,
        });
      }
      result.push(lines[i]);
      lastKept = i;
    }
  }
  return result;
}
