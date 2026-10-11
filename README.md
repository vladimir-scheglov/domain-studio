# Domain Studio

Самостоятельный редактор схем доменов EVO с экспортом YAML.

## Возможности

- Полноценный YAML-редактор на Monaco с автокомплитом и валидацией.
- Инспектор контекста: справка по текущему блоку схемы.
- Визарды для генерации сущностей, связей, представлений, действий, правил.
- Редактируемая диаграмма сущностей и связей (ReactFlow + Dagre).
- Палитра команд.
- Локальное хранение (IndexedDB), экспорт YAML.

## Стек

React 18, TypeScript 5, Vite 5, Zustand, Monaco, Tailwind, MUI 5, IndexedDB, Zod, ReactFlow, Dagre, Handlebars.

## Установка

\`\`\`bash
npm install
npm run dev
\`\`\`

## Структура

\`\`\`
src/
  app/           — корень приложения, тема, роутинг
  components/    — UI-компоненты
  domain/        — модель домена, Zod-схема, валидация, граф
  editor/        — Monaco: автокомплит, диагностика, hover
  services/      — сервисы: yaml, шаблоны, визарды, rql
  store/         — Zustand-сторы
  persistence/   — IndexedDB
  wizards/       — реализации визардов
  utils/         — утилиты
\`\`\`