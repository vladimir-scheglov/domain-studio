export type PresetSource = "builtin" | "user";

export type PresetCategory =
  | "starter"
  | "dictionary"
  | "itsm"
  | "security"
  | "cmdb"
  | "structure"
  | "utility";

export type DomainPreset = {
  id: string;
  name: string;
  description: string;
  yaml: string;
  source: PresetSource;
  category: PresetCategory;
  tags?: string[];
};

export const PRESET_CATEGORIES: Record<PresetCategory, string> = {
  starter: "Стартовые",
  dictionary: "Справочники",
  itsm: "ITSM / Инциденты",
  security: "Информационная безопасность",
  cmdb: "CMDB / Активы",
  structure: "Структуры",
  utility: "Заготовки",
};

export const BUILTIN_PRESETS: DomainPreset[] = [
  /* ================== STARTER ================== */

  {
    id: "builtin.empty",
    name: "Пустой домен",
    description: "Только метаданные — минимальная заготовка",
    source: "builtin",
    category: "starter",
    tags: ["empty", "заготовка"],
    yaml: `id: new.domain.tld
type: domain
version: 0.0.1
name: Новый домен
description: Опишите назначение домена
status: draft
`,
  },
  {
    id: "builtin.minimal",
    name: "Минимальный домен",
    description: "Одна сущность с базовыми атрибутами",
    source: "builtin",
    category: "starter",
    tags: ["starter", "минимальный"],
    yaml: `id: example.domain.tld
type: domain
version: 0.0.1
name: Новый домен
description: Минимальная схема домена
status: draft
entities:
  - id: Item
    name: Объект
    description: Основная сущность
    label: "{name}"
    attributes:
      - id: name
        name: Название
        dataType: String
      - id: description
        name: Описание
        dataType: Text
      - id: createdAt
        name: Дата создания
        dataType: Timestamp
`,
  },

  /* ================== DICTIONARY ================== */

  {
    id: "builtin.dictionary",
    name: "Домен-справочник",
    description: "Простой справочник с CRUD и меню",
    source: "builtin",
    category: "dictionary",
    tags: ["справочник", "dictionary"],
    yaml: `id: dictionaries.example.tld
type: domain
version: 0.0.1
name: Справочники
description: Домен простых справочников
entities:
  - id: CategoryDict
    name: Категории
    label: "{categoryName}"
    attributes:
      - id: categoryName
        name: Название
        dataType: String
      - id: categoryDescription
        name: Описание
        dataType: Text
actions:
  - id: actions_categoryCreate
    name: Добавить
    type: open_modal
    modal: forms_newCategory
    entity: CategoryDict
    operation: create
  - id: actions_categoryRemove
    name: Удалить
    type: bulk
    operation: remove
    entity: CategoryDict
views:
  - id: lists_categories
    type: list
    label: Категории
    source:
      type: operational
      entity: CategoryDict
    table:
      columns:
        - id: name
          attribute: categoryName
          label: Название
        - id: description
          attribute: categoryDescription
          label: Описание
menus:
  - id: menus_dictionaries
    route: /dictionaries
    label: Справочники
    type: root_group
    placement: top
    items:
      - id: menu_categories
        route: /dictionaries/categories
        label: Категории
        type: menu
        view: lists_categories
`,
  },
  {
    id: "builtin.dictionary-tree",
    name: "Дерево-справочник",
    description: "Иерархический справочник с parent-child",
    source: "builtin",
    category: "dictionary",
    tags: ["справочник", "дерево", "tree", "иерархия"],
    yaml: `id: tree.example.tld
type: domain
version: 0.0.1
name: Иерархические справочники
description: Древовидные категории с неограниченной вложенностью
entities:
  - id: NodeDict
    name: Узел категории
    label: "{nodeName}"
    attributes:
      - id: nodeName
        name: Название
        dataType: String
      - id: nodeCode
        name: Код
        dataType: String
      - id: nodeOrder
        name: Порядок
        dataType: Integer
linkages:
  - id: Node_Parent
    name: Родительский узел
    side1: NodeDict
    side2: NodeDict
    type: 1_n
    nameFrom:
      side1: Дочерние узлы
      side2: Родитель
trees:
  - id: CategoryTree
    type: orderable
    maxDepth: 10
    hierarchy:
      entity: NodeDict
      children:
        - linkage: Node_Parent
          entity: NodeDict
views:
  - id: lists_nodes
    type: list
    label: Категории
    source:
      type: operational
      entity: NodeDict
    table:
      columns:
        - id: name
          attribute: nodeName
          label: Название
        - id: code
          attribute: nodeCode
          label: Код
menus:
  - id: menus_tree
    route: /categories
    label: Категории
    type: root_group
    placement: top
    items:
      - id: menu_tree
        route: /categories/tree
        label: Дерево
        type: menu
        view: lists_nodes
`,
  },

  /* ================== ITSM ================== */

  {
    id: "builtin.incident",
    name: "Домен инцидентов",
    description: "Инцидент + связь со справочником + CRUD + список",
    source: "builtin",
    category: "itsm",
    tags: ["инциденты", "incident", "security"],
    yaml: `id: incidents.example.tld
type: domain
version: 0.0.1
name: Инциденты
description: Домен управления инцидентами
entities:
  - id: Incident
    name: Инцидент
    label: "{incidentSubject}"
    attributes:
      - id: incidentSubject
        name: Тема
        dataType: String
      - id: incidentDescription
        name: Описание
        dataType: Text
      - id: incidentStatus
        name: Статус
        dataType: String
      - id: incidentOpenedAt
        name: Дата регистрации
        dataType: Timestamp
linkages:
  - id: Incident_Category
    name: Категория инцидента
    side1: CategoryDict
    side2: Incident
    type: 1_n
    nameFrom:
      side1: Инциденты
      side2: Категория
dataTypes:
  - id: enumIncidentCategory
    name: Категории инцидентов
    dataType: Enum
    values:
      - id: Attack
        name: Атака
      - id: Malware
        name: Заражение
      - id: DataLeak
        name: Утечка данных
views:
  - id: lists_incidents
    type: list
    label: Инциденты
    source:
      type: operational
      entity: Incident
    table:
      columns:
        - id: subject
          attribute: incidentSubject
          label: Тема
        - id: status
          attribute: incidentStatus
          label: Статус
        - id: openedAt
          attribute: incidentOpenedAt
          label: Дата
actions:
  - id: actions_incidentCreate
    name: Добавить
    type: open_modal
    modal: forms_newIncident
    entity: Incident
    operation: create
  - id: actions_incidentRemove
    name: Удалить
    type: bulk
    operation: remove
    entity: Incident
menus:
  - id: menus_incidents
    route: /incidents
    label: Инциденты
    type: root_group
    placement: top
    items:
      - id: menu_incidents_list
        route: /incidents/all
        label: Все инциденты
        type: menu
        view: lists_incidents
`,
  },
  {
    id: "builtin.task-workflow",
    name: "Задачи с workflow",
    description: "Задача с жизненным циклом: Новый → В работе → Завершён",
    source: "builtin",
    category: "itsm",
    tags: ["задачи", "task", "workflow", "статусы"],
    yaml: `id: tasks.example.tld
type: domain
version: 0.0.1
name: Задачи
description: Домен управления задачами с жизненным циклом
entities:
  - id: Task
    name: Задача
    label: "{taskTitle}"
    attributes:
      - id: taskTitle
        name: Заголовок
        dataType: String
      - id: taskDescription
        name: Описание
        dataType: Text
      - id: taskStatus
        name: Статус
        dataType: workflowTask
      - id: taskPriority
        name: Приоритет
        dataType: Integer
      - id: taskDueDate
        name: Срок
        dataType: Date
dataTypes:
  - id: workflowTask
    name: Статусы задачи
    dataType: Workflow
    initial: NEW
    statuses:
      - id: NEW
        name: Новый
      - id: IN_PROGRESS
        name: В работе
      - id: ON_HOLD
        name: Приостановлен
      - id: DONE
        name: Завершён
      - id: CANCELLED
        name: Отменён
    transitions:
      - from: NEW
        to: IN_PROGRESS
      - from: IN_PROGRESS
        to: ON_HOLD
      - from: ON_HOLD
        to: IN_PROGRESS
      - from: IN_PROGRESS
        to: DONE
      - from: '*'
        to: CANCELLED
views:
  - id: lists_tasks
    type: list
    label: Задачи
    source:
      type: operational
      entity: Task
    table:
      columns:
        - id: title
          attribute: taskTitle
          label: Заголовок
        - id: status
          attribute: taskStatus
          label: Статус
        - id: priority
          attribute: taskPriority
          label: Приоритет
        - id: dueDate
          attribute: taskDueDate
          label: Срок
menus:
  - id: menus_tasks
    route: /tasks
    label: Задачи
    type: root_group
    placement: top
    items:
      - id: menu_tasks
        route: /tasks/all
        label: Все задачи
        type: menu
        view: lists_tasks
`,
  },
  {
    id: "builtin.change",
    name: "Изменения и релизы",
    description: "Управление изменениями с типами и статусами",
    source: "builtin",
    category: "itsm",
    tags: ["change", "изменения", "release", "релиз"],
    yaml: `id: changes.example.tld
type: domain
version: 0.0.1
name: Изменения
description: Домен управления изменениями и релизами
entities:
  - id: Change
    name: Изменение
    label: "{changeNumber} — {changeTitle}"
    attributes:
      - id: changeNumber
        name: Номер
        dataType: String
      - id: changeTitle
        name: Заголовок
        dataType: String
      - id: changeType
        name: Тип изменения
        dataType: enumChangeType
      - id: changeStatus
        name: Статус
        dataType: workflowChange
      - id: changePlanned
        name: Плановая дата
        dataType: Date
      - id: changeDescription
        name: Описание
        dataType: Text
dataTypes:
  - id: enumChangeType
    name: Типы изменений
    dataType: Enum
    values:
      - id: Standard
        name: Стандартное
      - id: Normal
        name: Нормальное
      - id: Emergency
        name: Экстренное
  - id: workflowChange
    name: Статусы изменения
    dataType: Workflow
    initial: DRAFT
    statuses:
      - id: DRAFT
        name: Черновик
      - id: APPROVAL
        name: Согласование
      - id: SCHEDULED
        name: Запланировано
      - id: IN_PROGRESS
        name: Выполняется
      - id: DONE
        name: Завершено
      - id: FAILED
        name: Отклонено
    transitions:
      - from: DRAFT
        to: APPROVAL
      - from: APPROVAL
        to: SCHEDULED
      - from: APPROVAL
        to: FAILED
      - from: SCHEDULED
        to: IN_PROGRESS
      - from: IN_PROGRESS
        to: DONE
views:
  - id: lists_changes
    type: list
    label: Изменения
    source:
      type: operational
      entity: Change
    table:
      columns:
        - id: number
          attribute: changeNumber
          label: Номер
        - id: title
          attribute: changeTitle
          label: Заголовок
        - id: type
          attribute: changeType
          label: Тип
        - id: status
          attribute: changeStatus
          label: Статус
menus:
  - id: menus_changes
    route: /changes
    label: Изменения
    type: root_group
    placement: top
    items:
      - id: menu_changes
        route: /changes/all
        label: Все изменения
        type: menu
        view: lists_changes
`,
  },

  /* ================== SECURITY ================== */

  {
    id: "builtin.vulnerability",
    name: "Уязвимости",
    description: "Уязвимости с CVSS и связью с активами",
    source: "builtin",
    category: "security",
    tags: ["vulnerability", "уязвимости", "CVSS", "ИБ"],
    yaml: `id: vuln.example.tld
type: domain
version: 0.0.1
name: Уязвимости
description: Домен управления уязвимостями
entities:
  - id: Vulnerability
    name: Уязвимость
    label: "{cveId} — {vulnTitle}"
    attributes:
      - id: cveId
        name: CVE-идентификатор
        dataType: String
      - id: vulnTitle
        name: Название
        dataType: String
      - id: vulnDescription
        name: Описание
        dataType: Text
      - id: cvssScore
        name: CVSS
        dataType: Decimal
        constraints:
          - kind: range
            min: 0
            max: 10
      - id: severity
        name: Критичность
        dataType: enumSeverity
      - id: publishedAt
        name: Дата публикации
        dataType: Date
  - id: Asset
    name: Актив
    label: "{assetName}"
    attributes:
      - id: assetName
        name: Название
        dataType: String
      - id: assetIp
        name: IP-адрес
        dataType: IpAddress
linkages:
  - id: Vuln_Asset
    name: Уязвимость затронула актив
    side1: Vulnerability
    side2: Asset
    type: n_n
    undirected: true
    nameFrom:
      side1: Затронутые активы
      side2: Уязвимости
dataTypes:
  - id: enumSeverity
    name: Критичность
    dataType: Enum
    values:
      - id: Critical
        name: Критическая
      - id: High
        name: Высокая
      - id: Medium
        name: Средняя
      - id: Low
        name: Низкая
      - id: Info
        name: Информационная
    view:
      - value: Critical
        color: '#d13438'
      - value: High
        color: '#ff8c00'
      - value: Medium
        color: '#ffd700'
      - value: Low
        color: '#4ec9b0'
      - value: Info
        color: '#9d9d9d'
views:
  - id: lists_vulns
    type: list
    label: Уязвимости
    source:
      type: operational
      entity: Vulnerability
    table:
      columns:
        - id: cve
          attribute: cveId
          label: CVE
        - id: title
          attribute: vulnTitle
          label: Название
        - id: cvss
          attribute: cvssScore
          label: CVSS
        - id: severity
          attribute: severity
          label: Критичность
menus:
  - id: menus_vulns
    route: /vulnerabilities
    label: Уязвимости
    type: root_group
    placement: top
    items:
      - id: menu_vulns
        route: /vulnerabilities/all
        label: Все уязвимости
        type: menu
        view: lists_vulns
`,
  },
  {
    id: "builtin.ioc",
    name: "Индикаторы компрометации",
    description: "IOC — IP, домены, хэши, email — со связью с инцидентами",
    source: "builtin",
    category: "security",
    tags: ["ioc", "indicators", "индикаторы", "threat"],
    yaml: `id: iocs.example.tld
type: domain
version: 0.0.1
name: Индикаторы компрометации
description: Домен учёта IOC и их связи с инцидентами
entities:
  - id: Ioc
    name: Индикатор
    label: "{iocType}: {iocValue}"
    attributes:
      - id: iocType
        name: Тип
        dataType: enumIocType
      - id: iocValue
        name: Значение
        dataType: String
      - id: iocConfidence
        name: Достоверность
        dataType: Integer
        constraints:
          - kind: range
            min: 0
            max: 100
      - id: iocFirstSeen
        name: Первое обнаружение
        dataType: Timestamp
      - id: iocSource
        name: Источник
        dataType: String
  - id: Incident
    name: Инцидент
    label: "{incidentTitle}"
    attributes:
      - id: incidentTitle
        name: Название
        dataType: String
      - id: incidentStatus
        name: Статус
        dataType: String
dataTypes:
  - id: enumIocType
    name: Типы индикаторов
    dataType: Enum
    values:
      - id: IP
        name: IP-адрес
      - id: Domain
        name: Домен
      - id: URL
        name: URL
      - id: Email
        name: Email
      - id: MD5
        name: MD5
      - id: SHA1
        name: SHA-1
      - id: SHA256
        name: SHA-256
      - id: File
        name: Файл
linkages:
  - id: Incident_Ioc
    name: Инцидент содержит IOC
    side1: Incident
    side2: Ioc
    type: n_n
    undirected: true
    nameFrom:
      side1: Содержит индикатор
      side2: Обнаружен в инциденте
views:
  - id: lists_iocs
    type: list
    label: Индикаторы
    source:
      type: operational
      entity: Ioc
    table:
      columns:
        - id: type
          attribute: iocType
          label: Тип
        - id: value
          attribute: iocValue
          label: Значение
        - id: confidence
          attribute: iocConfidence
          label: Достоверность
menus:
  - id: menus_iocs
    route: /iocs
    label: IOC
    type: root_group
    placement: top
    items:
      - id: menu_iocs
        route: /iocs/all
        label: Все индикаторы
        type: menu
        view: lists_iocs
`,
  },

  /* ================== CMDB ================== */

  {
    id: "builtin.assets",
    name: "Домен активов",
    description: "Оборудование + сервер + пользователи + связи",
    source: "builtin",
    category: "cmdb",
    tags: ["активы", "assets", "IT", "CMDB"],
    yaml: `id: assets.example.tld
type: domain
version: 0.0.1
name: Активы
description: Домен учёта IT-активов
entities:
  - id: Device
    name: Оборудование
    label: "{deviceName}"
    attributes:
      - id: deviceName
        name: Название
        dataType: String
      - id: deviceIp
        name: IP-адрес
        dataType: IpAddress
      - id: deviceOs
        name: ОС
        dataType: String
  - id: Server
    name: Сервер
    label: "{serverName}"
    inherits: Device
    attributes:
      - id: serverName
        name: Имя сервера
        dataType: String
      - id: serverLocation
        name: Расположение
        dataType: String
  - id: User
    name: Пользователь
    label: "{userFullName}"
    attributes:
      - id: userFullName
        name: ФИО
        dataType: String
      - id: userEmail
        name: Email
        dataType: String
linkages:
  - id: User_Device
    name: Владелец устройства
    side1: User
    side2: Device
    type: 1_n
    nameFrom:
      side1: Владеет
      side2: Принадлежит
views:
  - id: lists_devices
    type: list
    label: Устройства
    source:
      type: operational
      entity: Device
    table:
      columns:
        - id: name
          attribute: deviceName
          label: Название
        - id: ip
          attribute: deviceIp
          label: IP-адрес
menus:
  - id: menus_assets
    route: /assets
    label: Активы
    type: root_group
    placement: top
    items:
      - id: menu_devices
        route: /assets/devices
        label: Устройства
        type: menu
        view: lists_devices
`,
  },
  {
    id: "builtin.software",
    name: "ПО и лицензии",
    description: "Каталог ПО, лицензии и установки на устройствах",
    source: "builtin",
    category: "cmdb",
    tags: ["software", "ПО", "лицензии", "license"],
    yaml: `id: software.example.tld
type: domain
version: 0.0.1
name: Программное обеспечение
description: Учёт ПО и лицензий
entities:
  - id: Software
    name: Программное обеспечение
    label: "{swName} {swVersion}"
    attributes:
      - id: swName
        name: Название
        dataType: String
      - id: swVendor
        name: Производитель
        dataType: String
      - id: swVersion
        name: Версия
        dataType: String
      - id: swType
        name: Тип
        dataType: enumSwType
      - id: swLicenseCount
        name: Всего лицензий
        dataType: Integer
      - id: swLicenseUsed
        name: Использовано
        dataType: Integer
  - id: Device
    name: Устройство
    label: "{deviceName}"
    attributes:
      - id: deviceName
        name: Название
        dataType: String
linkages:
  - id: Device_Software
    name: ПО установлено на устройстве
    side1: Software
    side2: Device
    type: n_n
    undirected: true
    nameFrom:
      side1: Установлено на
      side2: Содержит ПО
dataTypes:
  - id: enumSwType
    name: Типы ПО
    dataType: Enum
    values:
      - id: System
        name: Системное
      - id: Application
        name: Прикладное
      - id: Security
        name: Защитное
      - id: Development
        name: Средства разработки
      - id: Other
        name: Прочее
views:
  - id: lists_software
    type: list
    label: ПО
    source:
      type: operational
      entity: Software
    table:
      columns:
        - id: name
          attribute: swName
          label: Название
        - id: vendor
          attribute: swVendor
          label: Производитель
        - id: version
          attribute: swVersion
          label: Версия
        - id: type
          attribute: swType
          label: Тип
menus:
  - id: menus_software
    route: /software
    label: ПО
    type: root_group
    placement: top
    items:
      - id: menu_software
        route: /software/catalog
        label: Каталог ПО
        type: menu
        view: lists_software
`,
  },

  /* ================== STRUCTURE ================== */

  {
    id: "builtin.organization",
    name: "Организационная структура",
    description: "Организации, отделы, сотрудники с иерархией",
    source: "builtin",
    category: "structure",
    tags: ["организация", "org", "отделы", "сотрудники"],
    yaml: `id: org.example.tld
type: domain
version: 0.0.1
name: Организационная структура
description: Компания, отделы, сотрудники
entities:
  - id: Organization
    name: Организация
    label: "{orgName}"
    attributes:
      - id: orgName
        name: Название
        dataType: String
      - id: orgInn
        name: ИНН
        dataType: String
      - id: orgAddress
        name: Адрес
        dataType: String
  - id: Department
    name: Отдел
    label: "{deptName}"
    attributes:
      - id: deptName
        name: Название
        dataType: String
      - id: deptCode
        name: Код
        dataType: String
  - id: Employee
    name: Сотрудник
    label: "{empFullName}"
    attributes:
      - id: empFullName
        name: ФИО
        dataType: String
      - id: empPosition
        name: Должность
        dataType: String
      - id: empEmail
        name: Email
        dataType: String
      - id: empPhone
        name: Телефон
        dataType: String
linkages:
  - id: Organization_Department
    name: Отделы организации
    side1: Organization
    side2: Department
    type: 1_n
    nameFrom:
      side1: Содержит отделы
      side2: Входит в организацию
  - id: Department_Employee
    name: Сотрудники отдела
    side1: Department
    side2: Employee
    type: 1_n
    nameFrom:
      side1: Сотрудники
      side2: Отдел
trees:
  - id: OrgTree
    maxDepth: 5
    hierarchy:
      entity: Organization
      children:
        - linkage: Organization_Department
          entity: Department
          children:
            - linkage: Department_Employee
              entity: Employee
views:
  - id: lists_employees
    type: list
    label: Сотрудники
    source:
      type: operational
      entity: Employee
    table:
      columns:
        - id: name
          attribute: empFullName
          label: ФИО
        - id: position
          attribute: empPosition
          label: Должность
        - id: email
          attribute: empEmail
          label: Email
menus:
  - id: menus_org
    route: /organization
    label: Организация
    type: root_group
    placement: top
    items:
      - id: menu_employees
        route: /organization/employees
        label: Сотрудники
        type: menu
        view: lists_employees
`,
  },
  {
    id: "builtin.documents",
    name: "Документы и регламенты",
    description: "Реестр документов с версиями и владельцами",
    source: "builtin",
    category: "structure",
    tags: ["документы", "documents", "регламенты", "policy"],
    yaml: `id: docs.example.tld
type: domain
version: 0.0.1
name: Документы
description: Реестр документов и регламентов
entities:
  - id: Document
    name: Документ
    label: "{docTitle}"
    attributes:
      - id: docTitle
        name: Название
        dataType: String
      - id: docType
        name: Тип
        dataType: enumDocType
      - id: docVersion
        name: Версия
        dataType: String
      - id: docStatus
        name: Статус
        dataType: enumDocStatus
      - id: docOwner
        name: Владелец
        dataType: String
      - id: docApprovedAt
        name: Дата утверждения
        dataType: Date
      - id: docValidUntil
        name: Действует до
        dataType: Date
      - id: docFile
        name: Файл
        dataType: Attachment
dataTypes:
  - id: enumDocType
    name: Типы документов
    dataType: Enum
    values:
      - id: Policy
        name: Политика
      - id: Regulation
        name: Регламент
      - id: Instruction
        name: Инструкция
      - id: Procedure
        name: Процедура
      - id: Report
        name: Отчёт
  - id: enumDocStatus
    name: Статусы документов
    dataType: Enum
    values:
      - id: Draft
        name: Черновик
      - id: Review
        name: На согласовании
      - id: Approved
        name: Утверждён
      - id: Archived
        name: Архив
views:
  - id: lists_docs
    type: list
    label: Документы
    source:
      type: operational
      entity: Document
    table:
      columns:
        - id: title
          attribute: docTitle
          label: Название
        - id: type
          attribute: docType
          label: Тип
        - id: version
          attribute: docVersion
          label: Версия
        - id: status
          attribute: docStatus
          label: Статус
        - id: validUntil
          attribute: docValidUntil
          label: Действует до
menus:
  - id: menus_docs
    route: /documents
    label: Документы
    type: root_group
    placement: top
    items:
      - id: menu_docs
        route: /documents/all
        label: Все документы
        type: menu
        view: lists_docs
`,
  },
  {
    id: "builtin.network",
    name: "Сети и подсети",
    description: "Топология сети: подсети с CIDR и устройства",
    source: "builtin",
    category: "structure",
    tags: ["сеть", "network", "подсети", "CIDR"],
    yaml: `id: network.example.tld
type: domain
version: 0.0.1
name: Сетевая топология
description: Учёт сетей, подсетей и устройств
entities:
  - id: Network
    name: Подсеть
    label: "{netCidr}"
    attributes:
      - id: netCidr
        name: CIDR
        dataType: CIDR
      - id: netName
        name: Название
        dataType: String
      - id: netVlan
        name: VLAN
        dataType: Integer
      - id: netDescription
        name: Описание
        dataType: Text
  - id: Device
    name: Устройство
    label: "{deviceName}"
    attributes:
      - id: deviceName
        name: Название
        dataType: String
      - id: deviceIp
        name: IP-адрес
        dataType: IpAddress
      - id: deviceMac
        name: MAC
        dataType: MAC
linkages:
  - id: Network_Device
    name: Устройства подсети
    side1: Network
    side2: Device
    type: 1_n
    nameFrom:
      side1: Содержит устройства
      side2: Входит в подсеть
views:
  - id: lists_networks
    type: list
    label: Подсети
    source:
      type: operational
      entity: Network
    table:
      columns:
        - id: cidr
          attribute: netCidr
          label: CIDR
        - id: name
          attribute: netName
          label: Название
        - id: vlan
          attribute: netVlan
          label: VLAN
menus:
  - id: menus_network
    route: /network
    label: Сеть
    type: root_group
    placement: top
    items:
      - id: menu_networks
        route: /network/subnets
        label: Подсети
        type: menu
        view: lists_networks
`,
  },

  /* ================== UTILITY ================== */

  {
    id: "builtin.utility.crud",
    name: "Заготовка: CRUD",
    description: "Сущность с полным набором действий и представлений",
    source: "builtin",
    category: "utility",
    tags: ["utility", "crud", "шаблон"],
    yaml: `id: template.crud.tld
type: domain
version: 0.0.1
name: CRUD заготовка
description: Замените EntityName на свою сущность
entities:
  - id: EntityName
    name: Название
    label: "{name}"
    attributes:
      - id: name
        name: Название
        dataType: String
      - id: description
        name: Описание
        dataType: Text
actions:
  - id: actions_entity_create
    name: Добавить
    type: open_modal
    modal: forms_new_entity
    entity: EntityName
    operation: create
  - id: actions_entity_openPanel
    name: Детали
    type: open_panel
    panel: panels_info_entity
    entity: EntityName
  - id: actions_entity_remove
    name: Удалить
    type: bulk
    operation: remove
    entity: EntityName
views:
  - id: lists_entity
    type: list
    label: Список
    source:
      type: operational
      entity: EntityName
    table:
      columns:
        - id: name
          attribute: name
          label: Название
        - id: description
          attribute: description
          label: Описание
      selection: true
    actionPanel:
      - widget: buttons_entity_create
      - widget: buttons_entity_remove
`,
  },
  {
    id: "builtin.utility.identifier",
    name: "Заготовка: идентификатор",
    description: "Сущность с человекочитаемым ID (INC-2025-10-0001)",
    source: "builtin",
    category: "utility",
    tags: ["utility", "identifier", "идентификатор"],
    yaml: `id: template.identifier.tld
type: domain
version: 0.0.1
name: Заготовка с идентификатором
description: Генерация ID с префиксом, датой и счётчиком
entities:
  - id: Ticket
    name: Заявка
    label: "{ticketId} — {ticketTitle}"
    attributes:
      - id: ticketId
        name: Номер заявки
        dataType: Identifier
        template: "{@prefix}-{@YY}/{@MM}/{@DD}-{@inc}"
        defaultPrefix: TKT
        incrementTemplate: "0000"
      - id: ticketTitle
        name: Заголовок
        dataType: String
      - id: ticketCreatedAt
        name: Создана
        dataType: Timestamp
`,
  },
  {
    id: "builtin.utility.inheritance",
    name: "Заготовка: наследование",
    description: "Базовый класс с потомками",
    source: "builtin",
    category: "utility",
    tags: ["utility", "наследование", "inheritance"],
    yaml: `id: template.inheritance.tld
type: domain
version: 0.0.1
name: Заготовка с наследованием
description: Родительская сущность и её потомки
entities:
  - id: BaseEntity
    name: Базовая сущность
    label: "{commonName}"
    attributes:
      - id: commonName
        name: Название
        dataType: String
      - id: commonDescription
        name: Описание
        dataType: Text
      - id: commonCreatedAt
        name: Создано
        dataType: Timestamp
  - id: ChildTypeA
    name: Потомок A
    label: "{commonName}"
    inherits: BaseEntity
    attributes:
      - id: childAField
        name: Специфичное поле A
        dataType: String
  - id: ChildTypeB
    name: Потомок B
    label: "{commonName}"
    inherits: BaseEntity
    attributes:
      - id: childBField
        name: Специфичное поле B
        dataType: Integer
`,
  },
  {
    id: "builtin.utility.many-to-many",
    name: "Заготовка: связь N-N",
    description: "Две сущности, связанные многие-ко-многим",
    source: "builtin",
    category: "utility",
    tags: ["utility", "n-n", "m2m"],
    yaml: `id: template.m2m.tld
type: domain
version: 0.0.1
name: Заготовка M2M
description: Пример связи многие-ко-многим
entities:
  - id: EntityA
    name: Сущность A
    label: "{nameA}"
    attributes:
      - id: nameA
        name: Название
        dataType: String
  - id: EntityB
    name: Сущность B
    label: "{nameB}"
    attributes:
      - id: nameB
        name: Название
        dataType: String
linkages:
  - id: EntityA_EntityB
    name: Связь A — B
    side1: EntityA
    side2: EntityB
    type: n_n
    undirected: true
    nameFrom:
      side1: Связано с B
      side2: Связано с A
`,
  },
];
