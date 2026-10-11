import { useEffect, useMemo, useState } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Dialog,
    Divider,
    FormControlLabel,
    MenuItem,
    Step,
    StepLabel,
    Stepper,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import {
    wizardRegistry,
    type WizardField,
    type WizardResult,
} from '@/services/wizardRegistry';
import { useDocumentStore } from '@/store/documentStore';
import { useSelectionStore } from '@/store/selectionStore';
import { applyPatch } from '@/domain/patch';
import {
    collectReferences,
    getEntityIds,
    getLinkageIds,
    getAttributesOfEntity,
    type DomainReferences,
} from '@/domain/references';
import { useRqlEditorStore } from '@/store/rqlEditorStore';
import { useWizardStore } from '@/store/wizardStore';
import { useNotificationStore } from '@/store/notificationStore';
import { parse as parseYamlFragment } from 'yaml';
import { findCollisions, formatKind } from '@/domain/collisions';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Alert, AlertTitle } from '@mui/material';
import { useValidationStore } from '@/store/validationStore';
import { withHistory } from '@/services/historyService';
import { buildMixinTargetsIndex, collectEntityViewComponents, readEntityViewById } from '@/domain/mixinTargets';
import { useWizardTourStore } from '@/store/wizardTourStore';
import { WIZARD_TOURS } from '@/domain/wizardTours';

export function WizardHost() {
    const wizardId = useWizardStore((s) => s.activeWizardId);
    const closeWizard = useWizardStore((s) => s.close);
    const wizard = wizardId ? wizardRegistry.get(wizardId) : null;

    const yaml = useDocumentStore((s) => s.yaml);
    const parsed = useDocumentStore((s) => s.parsed);
    const setYaml = useDocumentStore((s) => s.setYaml);
    const cursorPath = useSelectionStore((s) => s.cursorPath);

    const [stepIndex, setStepIndex] = useState(0);
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<WizardResult | null>(null);
    const [collisions, setCollisions] = useState<ReturnType<typeof findCollisions>>([]);

    const references = useMemo<DomainReferences>(
        () => collectReferences(parsed),
        [parsed]
    );
    const notify = useNotificationStore((s) => s.notify);

    const prefill = useWizardStore((s) => s.prefill);

    useEffect(() => {
        if (!wizard) return;
        const initial: Record<string, unknown> = {};
        for (const step of wizard.steps) {
            for (const field of step.fields) {
                if (field.defaultValue !== undefined) {
                    initial[field.name] = field.defaultValue;
                } else if (field.type === 'boolean') {
                    initial[field.name] = false;
                } else if (field.type === 'multiselect') {
                    initial[field.name] = [];
                }
            }
        }
        // накладываем prefill поверх дефолтов
        Object.assign(initial, prefill);
        setValues(initial);
        setStepIndex(0);
        setErrors({});
        setPreview(null);
    }, [wizard, prefill]);

    useEffect(() => {
        if (!wizard) return;
        const tourStore = useWizardTourStore.getState();
        if (!WIZARD_TOURS[wizard.id]) return;
        if (tourStore.seen(wizard.id)) return;
        // Небольшая задержка, чтобы модалка отрендерилась
        const t = setTimeout(() => {
            tourStore.start(wizard.id);
        }, 400);
        return () => clearTimeout(t);
    }, [wizard]);

    useEffect(() => {
        const handler = (e: Event) => {
            const target = (e as CustomEvent).detail as number;
            if (typeof target === 'number') {
                setStepIndex(target);
            }
        };
        window.addEventListener(
            'domain-studio:wizard-tour-go-to-step',
            handler
        );
        return () =>
            window.removeEventListener(
                'domain-studio:wizard-tour-go-to-step',
                handler
            );
    }, []);

    const currentStep = wizard?.steps[stepIndex];
    const isLastStep = wizard ? stepIndex === wizard.steps.length - 1 : false;

    const handleChange = (name: string, value: unknown) => {
        setValues((v) => ({ ...v, [name]: value }));
        setErrors((e) => {
            if (!e[name]) return e;
            const { [name]: _removed, ...rest } = e;
            return rest;
        });
    };

    const goNext = () => {
        if (!wizard || !currentStep) return;
        const validation = currentStep.validate?.(values, values);
        if (validation) {
            setErrors(validation);
            return;
        }
        if (isLastStep) {
            const result = wizard.generate(values, { parsed, cursorPath });
            setPreview(result);

            // проверяем коллизии
            try {
                const fragment = parseYamlFragment(result.yaml);
                const current = useDocumentStore.getState().parsed;
                const cols = findCollisions(current, fragment);
                setCollisions(cols);
            } catch {
                setCollisions([]);
            }

            return;
        }
        setStepIndex((i) => i + 1);
    };

    const goBack = () => {
        if (preview) {
            setPreview(null);
            return;
        }
        setStepIndex((i) => Math.max(0, i - 1));
    };

    const apply = () => {
        if (!preview) return;

        const beforeDiags = countErrors();

        const applied = withHistory(preview.summary ?? 'Визард', () => {
            const result = applyPatch(yaml, preview);
            setYaml(result.yaml, result.parsed, result.doc);
            return result;
        });

        if (!applied) {
            notify('Не удалось применить изменения', 'error', 4000);
            return;
        }

        // пост-валидация
        setTimeout(() => {
            const afterDiags = countErrors();
            if (afterDiags > beforeDiags) {
                notify(
                    `После применения появилось ошибок: ${afterDiags - beforeDiags}. Проверьте панель проблем.`,
                    'warning',
                    5000
                );
            }
        }, 400);

        useWizardTourStore.getState().stop();
        closeWizard();
    };

    useEffect(() => {
        if (!wizard) {
            setCollisions([]);
        }
    }, [wizard]);

    return (
        <Dialog
            open={Boolean(wizard)}
            onClose={() => {
                useWizardTourStore.getState().stop();
                closeWizard();
            }}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    bgcolor: '#252526',
                    backgroundImage: 'none',
                    border: '1px solid #3c3c3c',
                    borderRadius: 2,
                },
            }}
        >
            {wizard && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {wizard.title}
                    </Typography>
                    {wizard.description && (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {wizard.description}
                        </Typography>
                    )}

                    <Stepper
                        activeStep={preview ? wizard.steps.length : stepIndex}
                        sx={{ my: 3 }}
                    >
                        {wizard.steps.map((step) => (
                            <Step key={step.id}>
                                <StepLabel>{step.title}</StepLabel>
                            </Step>
                        ))}
                        <Step>
                            <StepLabel>Превью</StepLabel>
                        </Step>
                    </Stepper>

                    <Divider sx={{ mb: 2 }} />

                    {preview ? (
                        <>
                            {collisions.length > 0 && <CollisionsBlock collisions={collisions} />}
                            <PreviewBlock preview={preview} />
                        </>
                    ) : currentStep ? (
                        <StepBlock
                            step={currentStep}
                            values={values}
                            errors={errors}
                            references={references}
                            onChange={handleChange}
                        />
                    ) : null}

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1,
                            mt: 3,
                        }}
                    >
                        <Button onClick={closeWizard}>Отмена</Button>
                        {(stepIndex > 0 || preview) && (
                            <Button onClick={goBack} variant="outlined">
                                Назад
                            </Button>
                        )}
                        {!preview && (
                            <Button onClick={goNext} variant="contained">
                                {isLastStep ? 'Сформировать' : 'Далее'}
                            </Button>
                        )}
                        {preview && (
                            <Button onClick={apply} variant="contained">
                                Применить
                            </Button>
                        )}
                    </Box>
                </Box>
            )}
        </Dialog>
    );
}

/* ------------------------------------------------------------------ */
/*                         Шаг визарда                                 */
/* ------------------------------------------------------------------ */

type StepBlockProps = {
    step: {
        id: string;
        title: string;
        description?: string;
        fields: WizardField[];
    };
    values: Record<string, unknown>;
    errors: Record<string, string>;
    references: DomainReferences;
    onChange: (name: string, value: unknown) => void;
};

function resolveFields(
    fields: WizardField[],
    values: Record<string, unknown>,
    parsed: unknown
): WizardField[] {
    return fields.map((f) => {
        if (!f.dynamicOptions) return f;

        switch (f.dynamicOptions) {
            case 'mixinTargets': {
                const index = buildMixinTargetsIndex(parsed);
                const all = [
                    ...index.byKind.entity_view,
                    ...index.byKind.panel,
                    ...index.byKind.modal,
                    ...index.byKind.page,
                    ...index.byKind.list,
                    ...index.byKind.tabs_list,
                    ...index.byKind.dashboard,
                    ...index.byKind.dashboard_tree,
                    ...index.byKind.tree,
                ];
                return {
                    ...f,
                    options: all.map((r) => ({
                        value: r.id,
                        label: `${r.id} · ${r.kind}${r.label ? ' · ' + r.label : ''}`,
                    })),
                };
            }

            case 'mixinContents': {
                const index = buildMixinTargetsIndex(parsed);
                const all = [
                    ...index.byKind.block,
                    ...index.byKind.tab,
                    ...index.byKind.form,
                    ...index.byKind.tabs,
                    ...index.byKind.list,
                    ...index.byKind.page,
                    ...index.byKind.widget,
                ];
                return {
                    ...f,
                    options: all.map((r) => ({
                        value: r.id,
                        label: `${r.id} · ${r.kind}${r.parentId ? ' · ' + r.parentId : ''}`,
                    })),
                };
            }
            
            case 'entityAttributes': {
                const entityId = String(values.entityId ?? '').trim();
                const attrs = readEntityAttributes(parsed, entityId);
                return {
                    ...f,
                    options: attrs.map((a) => ({
                        value: a.id,
                        label: `${a.name ?? a.id} (${a.id})`,
                    })),
                };
            }

            case 'listViews': {
                const views = readViews(parsed, ['list']);
                return {
                    ...f,
                    options: views.map((v) => ({
                        value: v.id,
                        label: `${v.label ?? v.id} (${v.id})`,
                    })),
                };
            }

            case 'allViews': {
                const views = readViews(parsed, [
                    'entity',
                    'list',
                    'dashboard',
                    'tree',
                ]);
                return {
                    ...f,
                    options: views.map((v) => ({
                        value: v.id,
                        label: `${v.label ?? v.id} (${v.id}) [${v.type}]`,
                    })),
                };
            }

            case 'existingTrees': {
                const trees = readTrees(parsed);
                return {
                    ...f,
                    options: trees.map((t) => ({
                        value: t.id,
                        label: `${t.id}${t.type ? ' · ' + t.type : ''}`,
                    })),
                };
            }

            case 'existingLinkages': {
                const linkages = readLinkages(parsed);
                return {
                    ...f,
                    options: linkages.map((l) => ({
                        value: l.id,
                        label: `${l.name ?? l.id} (${l.side1} → ${l.side2})`,
                    })),
                };
            }

            case 'entityViews': {
                const views = readViews(parsed, ['entity']);
                return {
                    ...f,
                    options: views.map((v) => ({
                        value: v.id,
                        label: `${v.label ?? v.id} (${v.id})`,
                    })),
                };
            }

            case 'existingMixins': {
                const mixins = readMixins(parsed);
                return {
                    ...f,
                    options: mixins.map((m) => ({
                        value: m.id,
                        label: `${m.name ?? m.id} (${m.type ?? 'linkage'})`,
                    })),
                };
            }
            case 'entityViewComponents': {
                const fromViewId = String(values.fromView ?? '').trim();
                if (!fromViewId) {
                    return { ...f, options: [] };
                }
                const view = readEntityViewById(parsed, fromViewId);
                if (!view) return { ...f, options: [] };
                const comps = collectEntityViewComponents(view);
                return {
                    ...f,
                    options: comps.map((c) => ({
                        value: c.id,
                        label: `${c.id} · ${c.kind}${c.label ? ' · ' + c.label : ''}`,
                    })),
                };
            }

            default:
                return f;
        }
    });
}

function readMixins(
    parsed: unknown
): Array<{ id: string; name?: string; type?: string }> {
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Record<string, unknown>).mixins)
    ) {
        return [];
    }
    const arr = (
        parsed as { mixins: Array<{ id?: string; name?: string; type?: string }> }
    ).mixins;
    return arr
        .filter((m) => typeof m.id === 'string')
        .map((m) => ({
            id: String(m.id),
            name: m.name,
            type: m.type,
        }));
}

function readEntityAttributes(
    parsed: unknown,
    entityId: string
): Array<{ id: string; name?: string }> {
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Record<string, unknown>).entities)
    ) {
        return [];
    }
    const entities = (
        parsed as {
            entities: Array<{
                id: string;
                attributes?: Array<{ id: string; name?: string }>;
            }>;
        }
    ).entities;
    const ent = entities.find((e) => e.id === entityId);
    return ent?.attributes ?? [];
}

function readViews(
    parsed: unknown,
    types: string[]
): Array<{ id: string; label?: string; type: string }> {
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Record<string, unknown>).views)
    ) {
        return [];
    }
    const views = (
        parsed as {
            views: Array<{ id: string; label?: string; type?: string }>;
        }
    ).views;
    return views
        .filter((v) => typeof v.id === 'string' && types.includes(v.type ?? ''))
        .map((v) => ({
            id: v.id,
            label: v.label,
            type: v.type ?? 'list',
        }));
}

function readTrees(
    parsed: unknown
): Array<{ id: string; type?: string }> {
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Record<string, unknown>).trees)
    ) {
        return [];
    }
    const trees = (parsed as { trees: Array<{ id: string; type?: string }> })
        .trees;
    return trees.filter((t) => typeof t.id === 'string');
}

function readLinkages(
    parsed: unknown
): Array<{ id: string; name?: string; side1?: string; side2?: string }> {
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as Record<string, unknown>).linkages)
    ) {
        return [];
    }
    const linkages = (
        parsed as {
            linkages: Array<{
                id: string;
                name?: string;
                side1?: string;
                side2?: string;
            }>;
        }
    ).linkages;
    return linkages.filter((l) => typeof l.id === 'string');
}

function StepBlock({
    step,
    values,
    errors,
    references,
    onChange,
}: StepBlockProps) {
    const parsed = useDocumentStore((s) => s.parsed);
    const fields = useMemo(
        () => resolveFields(step.fields, values, parsed),
        [step.fields, values, parsed]
    );

    return (
        <Box>
            {step.description && (
                <Typography
                    variant="body2"
                    sx={{ mb: 2, opacity: 0.7, fontSize: 12 }}
                >
                    {step.description}
                </Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {fields.map((field) => (
                    <Box key={field.name} data-wizard-field={field.name}>
                        <FieldRenderer
                            field={field}
                            value={values[field.name]}
                            error={errors[field.name]}
                            references={references}
                            allValues={values}
                            onChange={(v) => onChange(field.name, v)}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                       Рендер поля                                  */
/* ------------------------------------------------------------------ */

type FieldRendererProps = {
    field: WizardField;
    value: unknown;
    error?: string;
    references: DomainReferences;
    allValues: Record<string, unknown>;
    onChange: (value: unknown) => void;
};

function FieldRenderer({
    field,
    value,
    error,
    references,
    allValues,
    onChange,
}: FieldRendererProps) {
    const commonHelp = field.help ? (
        <Typography
            variant="caption"
            sx={{ mt: 0.5, display: 'block', opacity: 0.6 }}
        >
            {field.help}
        </Typography>
    ) : null;

    if (field.type === 'boolean') {
        return (
            <FormControlLabel
                control={
                    <Switch
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                }
                label={field.label}
            />
        );
    }

    if (field.type === 'entity-ref') {
        const options = getEntityIds(references);
        return (
            <Box>
                <Autocomplete
                    freeSolo
                    options={options}
                    value={String(value ?? '')}
                    onChange={(_, newValue) => onChange(newValue ?? '')}
                    onInputChange={(_, newInput) => onChange(newInput)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={field.label}
                            placeholder={field.placeholder}
                            error={Boolean(error)}
                            helperText={error}
                            size="small"
                            fullWidth
                            required={field.required}
                        />
                    )}
                />
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'attribute-ref') {
        const entityId = String(allValues.entityId ?? '').trim();
        const options = entityId
            ? getAttributesOfEntity(references, entityId).map((a) => a.id)
            : references.attributes.map((a) => a.id);
        return (
            <Box>
                <Autocomplete
                    freeSolo
                    options={options}
                    value={String(value ?? '')}
                    onChange={(_, newValue) => onChange(newValue ?? '')}
                    onInputChange={(_, newInput) => onChange(newInput)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={field.label}
                            placeholder={field.placeholder}
                            error={Boolean(error)}
                            helperText={error}
                            size="small"
                            fullWidth
                            required={field.required}
                        />
                    )}
                />
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'linkage-ref') {
        const options = getLinkageIds(references);
        return (
            <Box>
                <Autocomplete
                    freeSolo
                    options={options}
                    value={String(value ?? '')}
                    onChange={(_, newValue) => onChange(newValue ?? '')}
                    onInputChange={(_, newInput) => onChange(newInput)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={field.label}
                            placeholder={field.placeholder}
                            error={Boolean(error)}
                            helperText={error}
                            size="small"
                            fullWidth
                            required={field.required}
                        />
                    )}
                />
                {commonHelp}
            </Box>
        );
    }
    if (field.type === 'rql') {
        return (
            <Box>
                <TextField
                    label={field.label}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    size="small"
                    required={field.required}
                    InputProps={{
                        endAdornment: (
                            <Button
                                size="small"
                                onClick={() =>
                                    useRqlEditorStore.getState().open({
                                        value: String(value ?? ''),
                                        title: field.label,
                                        help: field.help,
                                        onApply: (v) => onChange(v),
                                    })
                                }
                                sx={{ ml: 1, whiteSpace: 'nowrap' }}
                            >
                                Открыть RQL
                            </Button>
                        ),
                    }}
                />
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'textarea') {
        return (
            <Box>
                <TextField
                    label={field.label}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    multiline
                    minRows={3}
                    size="small"
                />
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'multiselect') {
        const current = Array.isArray(value) ? (value as string[]) : [];
        const options = field.options ?? [];

        const toggle = (v: string) => {
            const next = current.includes(v)
                ? current.filter((x) => x !== v)
                : [...current, v];
            onChange(next);
        };

        return (
            <Box>
                <Typography
                    sx={{ fontSize: 12, color: '#d4d4d4', mb: 0.75 }}
                >
                    {field.label}
                    {field.required && (
                        <Box component="span" sx={{ color: '#f48771', ml: 0.5 }}>
                            *
                        </Box>
                    )}
                </Typography>

                {options.length === 0 ? (
                    <Typography sx={{ fontSize: 11, color: '#7a7a7a' }}>
                        Нет доступных опций
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.25,
                            maxHeight: 220,
                            overflow: 'auto',
                            border: '1px solid #3c3c3c',
                            borderRadius: 1,
                            p: 0.75,
                            bgcolor: '#1f1f20',
                        }}
                    >
                        {options.map((opt) => {
                            const checked = current.includes(opt.value);
                            return (
                                <Box
                                    key={opt.value}
                                    onClick={() => toggle(opt.value)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        px: 0.75,
                                        py: 0.4,
                                        borderRadius: 0.5,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        bgcolor: checked
                                            ? 'rgba(14, 99, 156, 0.15)'
                                            : 'transparent',
                                        '&:hover': {
                                            bgcolor: checked
                                                ? 'rgba(14, 99, 156, 0.25)'
                                                : 'rgba(255, 255, 255, 0.04)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: 0.25,
                                            border: '1px solid',
                                            borderColor: checked ? '#4fc1ff' : '#5a5a5a',
                                            bgcolor: checked ? '#0e639c' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {checked && (
                                            <Box
                                                sx={{
                                                    width: 6,
                                                    height: 6,
                                                    bgcolor: '#fff',
                                                    borderRadius: 0.25,
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: 11.5,
                                            color: checked ? '#ffffff' : '#d4d4d4',
                                            flex: 1,
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}
                                    >
                                        {opt.label}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {error && (
                    <Typography sx={{ fontSize: 10, color: '#f48771', mt: 0.5 }}>
                        {error}
                    </Typography>
                )}
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'select') {
        return (
            <Box>
                <TextField
                    select
                    label={field.label}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(e.target.value)}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    size="small"
                >
                    {field.options?.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </TextField>
                {commonHelp}
            </Box>
        );
    }

    if (field.type === 'number') {
        return (
            <Box>
                <TextField
                    type="number"
                    label={field.label}
                    value={String(value ?? '')}
                    onChange={(e) => onChange(Number(e.target.value))}
                    error={Boolean(error)}
                    helperText={error}
                    fullWidth
                    size="small"
                />
                {commonHelp}
            </Box>
        );
    }

    // text и rql — обычный input
    return (
        <Box>
            <TextField
                label={field.label}
                value={String(value ?? '')}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder}
                error={Boolean(error)}
                helperText={error}
                fullWidth
                size="small"
                required={field.required}
            />
            {commonHelp}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/*                          Превью                                    */
/* ------------------------------------------------------------------ */

function PreviewBlock({ preview }: { preview: WizardResult }) {
    return (
        <Box>
            {preview.summary && (
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                    {preview.summary}
                </Typography>
            )}
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Будет вставлен следующий фрагмент:
            </Typography>
            <Box
                component="pre"
                sx={{
                    mt: 1,
                    p: 2,
                    bgcolor: '#1e1e1e',
                    border: '1px solid #3c3c3c',
                    borderRadius: 1,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 300,
                    whiteSpace: 'pre',
                }}
            >
                {preview.yaml}
            </Box>
        </Box>
    );
}

function CollisionsBlock({
    collisions,
}: {
    collisions: ReturnType<typeof findCollisions>;
}) {
    return (
        <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{
                mb: 2,
                bgcolor: 'rgba(255, 200, 100, 0.1)',
                color: '#dcdcaa',
                border: '1px solid #7a6a3b',
                '& .MuiAlert-icon': { color: '#dcdcaa' },
            }}
        >
            <AlertTitle sx={{ fontSize: 13, fontWeight: 600 }}>
                Найдены совпадения id ({collisions.length})
            </AlertTitle>
            <Typography sx={{ fontSize: 12 }}>
                Следующие элементы уже существуют в документе.
                Существующие будут <b>обновлены</b>, а не созданы заново:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {collisions.slice(0, 8).map((c, i) => (
                    <Typography
                        key={i}
                        sx={{
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: '#e8d48a',
                        }}
                    >
                        • {formatKind(c.kind)}: <b>{c.id}</b>
                    </Typography>
                ))}
                {collisions.length > 8 && (
                    <Typography sx={{ fontSize: 11, color: '#a09060', mt: 0.5 }}>
                        … и ещё {collisions.length - 8}
                    </Typography>
                )}
            </Box>
        </Alert>
    );
}

function countErrors(): number {
    return useValidationStore.getState().diagnostics.filter(
        (d) => d.severity === 'error'
    ).length;
}