/**
 * Точка сбора всех визардов.
 *
 * Достаточно импортировать этот файл один раз — все `wizardRegistry.register`
 * вызовы выполнятся как побочный эффект импорта модулей ниже.
 */

import "./entityBasic";
import "./attributeBasic";
import "./enumAttribute";
import "./linkageBasic";
import "./actionCreate";
import "./viewList";
import "./menuRoot";
import "./dataRules";
import "./editEntity";
import "./scenarioFromEntity";
import "./viewFromEntity";
import "./actionFromEntity";
import "./viewAdvanced";
import "./mixins";
import "./mixinViews";
import "./ruleLinkageCount";
import "./mixinComponentViews";
import "./mixinFromView";
import "./viewColumn";

export {}; // модуль без экспортов — только побочные эффекты
