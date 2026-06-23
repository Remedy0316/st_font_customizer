// SillyTavern Font Customizer Extension
// Allows users to customize font family, size, line height, and letter spacing.

const MODULE_NAME = 'font_customizer';
const extensionFolderPath = `scripts/extensions/third-party/st_font_customizer`;

// Idempotency guard so init() is safe to call from both the manifest
// `activate` hook (ST >= 1.17 with hook system) and the legacy jQuery
// fallback below (older ST versions).
let _initialized = false;

const defaultSettings = Object.freeze({
    enabled: false,
    source: 'system',        // 'system' or 'google'
    fontFamily: '',           // system/generic font family
    fontFamilyHistory: [],     // saved system/generic font names
    googleFont: '',           // Google Fonts font name
    googleFontHistory: [],    // saved Google Font names
    fontSize: 0,              // 0 = use default
    lineHeight: 0,            // 0 = use default
    letterSpacing: 0,
    scope: 'chat',            // 'chat' or 'ui'
});

let currentGoogleFontLink = null;
const fontAvailabilityCache = new Map();
const genericFontFamilies = new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'ui-rounded',
    'emoji',
    'math',
    'fangsong',
    'inherit',
    'initial',
    'unset',
    'revert',
    'revert-layer',
]);
const platformFontHints = new Map([
    ['windows', new Set([
        'arial',
        'bahnschrift',
        'calibri',
        'cambria',
        'candara',
        'comic sans ms',
        'consolas',
        'constantia',
        'corbel',
        'courier new',
        'georgia',
        'impact',
        'lucida console',
        'lucida sans unicode',
        'microsoft sans serif',
        'palatino linotype',
        'segoe ui',
        'tahoma',
        'times new roman',
        'trebuchet ms',
        'verdana',
    ])],
    ['ios', new Set([
        'arial',
        'avenir',
        'avenir next',
        'courier',
        'courier new',
        'georgia',
        'helvetica',
        'helvetica neue',
        'menlo',
        'palatino',
        'times new roman',
        'trebuchet ms',
        'verdana',
    ])],
    ['macos', new Set([
        'arial',
        'avenir',
        'avenir next',
        'courier',
        'courier new',
        'georgia',
        'helvetica',
        'helvetica neue',
        'menlo',
        'monaco',
        'palatino',
        'sf pro display',
        'sf pro text',
        'times new roman',
        'trebuchet ms',
        'verdana',
    ])],
]);

/**
 * Get or initialize extension settings.
 */
function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    }
    for (const key of Object.keys(defaultSettings)) {
        if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
            const val = defaultSettings[key];
            extensionSettings[MODULE_NAME][key] = (typeof val === 'object' && val !== null) ? structuredClone(val) : val;
        }
    }
    return extensionSettings[MODULE_NAME];
}

/**
 * Load a Google Font via a <link> element.
 */
function loadGoogleFont(fontName) {
    if (!fontName) {
        removeGoogleFontLink();
        return;
    }
    const encodedFont = encodeURIComponent(fontName);
    const href = `https://fonts.googleapis.com/css2?family=${encodedFont}:wght@300;400;500;600;700&display=swap`;

    if (currentGoogleFontLink) {
        currentGoogleFontLink.href = href;
    } else {
        const link = document.createElement('link');
        link.id = 'font_customizer_google_link';
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        currentGoogleFontLink = link;
    }
}

function removeGoogleFontLink() {
    if (currentGoogleFontLink) {
        currentGoogleFontLink.remove();
        currentGoogleFontLink = null;
    }
}

/**
 * Apply the font settings to the page via a dynamic <style> element.
 */
function applyFontStyles() {
    const settings = getSettings();
    let styleEl = document.getElementById('font_customizer_dynamic_style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'font_customizer_dynamic_style';
        document.head.appendChild(styleEl);
    }

    if (!settings.enabled) {
        styleEl.textContent = '';
        removeGoogleFontLink();
        return;
    }

    // Determine font family
    let fontFamily = '';
    if (settings.source === 'google' && settings.googleFont) {
        fontFamily = `"${settings.googleFont}"`;
        loadGoogleFont(settings.googleFont);
    } else if (settings.source === 'system' && settings.fontFamily) {
        fontFamily = settings.fontFamily;
        removeGoogleFontLink();
    } else {
        removeGoogleFontLink();
    }

    // Build CSS rules
    const rules = [];
    if (fontFamily) {
        rules.push(`font-family: ${fontFamily} !important;`);
    }
    if (settings.fontSize > 0) {
        rules.push(`font-size: ${settings.fontSize}px !important;`);
    }
    if (settings.lineHeight > 0) {
        rules.push(`line-height: ${settings.lineHeight} !important;`);
    }
    if (settings.letterSpacing !== 0) {
        rules.push(`letter-spacing: ${settings.letterSpacing}px !important;`);
    }

    if (rules.length === 0) {
        styleEl.textContent = '';
        return;
    }

    const cssBlock = rules.join('\n    ');

    // Choose selector based on scope
    let css = '';
    if (settings.scope === 'ui') {
        const uiSelector = [
            'body',
            'body input',
            'body textarea',
            'body select',
            'body button',
            'body [contenteditable="true"]',
            '#send_textarea',
        ].join(',\n');

        css = `${uiSelector} {\n    ${cssBlock}\n}`;
    } else {
        // Chat messages only
        css = `#chat .mes_text {\n    ${cssBlock}\n}`;
    }

    styleEl.textContent = css;

    // Also update preview
    updatePreview();
}

/**
 * Update the preview box with current settings.
 */
function updatePreview() {
    const settings = getSettings();
    const previewEl = document.getElementById('font_customizer_preview');
    if (!previewEl) return;

    previewEl.style.fontFamily = '';
    previewEl.style.fontSize = '';
    previewEl.style.lineHeight = '';
    previewEl.style.letterSpacing = '';

    if (settings.source === 'google' && settings.googleFont) {
        previewEl.style.fontFamily = `"${settings.googleFont}"`;
    } else if (settings.source === 'system' && settings.fontFamily) {
        previewEl.style.fontFamily = settings.fontFamily;
    }
    if (settings.fontSize > 0) {
        previewEl.style.fontSize = `${settings.fontSize}px`;
    }
    if (settings.lineHeight > 0) {
        previewEl.style.lineHeight = `${settings.lineHeight}`;
    }
    if (settings.letterSpacing !== 0) {
        previewEl.style.letterSpacing = `${settings.letterSpacing}px`;
    }
}

/**
 * Populate UI controls with current settings values.
 */
function loadSettingsUI() {
    const settings = getSettings();

    $('#font_customizer_enabled').prop('checked', settings.enabled);
    $('#font_customizer_source').val(settings.source);
    $('#font_customizer_family').val(settings.fontFamily);
    $('#font_customizer_google_font').val(settings.googleFont);
    $('#font_customizer_scope').val(settings.scope);

    // Sliders
    if (settings.fontSize > 0) {
        $('#font_customizer_size').val(settings.fontSize);
        $('#font_customizer_size_value').text(`${settings.fontSize}px`);
    } else {
        $('#font_customizer_size').val(16);
        $('#font_customizer_size_value').text('default');
    }

    if (settings.lineHeight > 0) {
        $('#font_customizer_line_height').val(settings.lineHeight);
        $('#font_customizer_line_height_value').text(settings.lineHeight.toFixed(1));
    } else {
        $('#font_customizer_line_height').val(1.5);
        $('#font_customizer_line_height_value').text('default');
    }

    $('#font_customizer_letter_spacing').val(settings.letterSpacing);
    $('#font_customizer_letter_spacing_value').text(settings.letterSpacing);

    // Toggle visibility of font source groups
    toggleFontSourceUI(settings.source);
}

function toggleFontSourceUI(source) {
    if (source === 'google') {
        $('#font_customizer_system_group').hide();
        $('#font_customizer_google_group').show();
    } else {
        $('#font_customizer_system_group').show();
        $('#font_customizer_google_group').hide();
        updateSystemFontAvailability();
    }
}

function parseFontFamilyList(fontFamily) {
    const fontNames = [];
    let currentName = '';
    let quoteCharacter = null;

    for (const character of fontFamily) {
        if ((character === '"' || character === "'") && !quoteCharacter) {
            quoteCharacter = character;
            currentName += character;
            continue;
        }

        if (character === quoteCharacter) {
            quoteCharacter = null;
            currentName += character;
            continue;
        }

        if (character === ',' && !quoteCharacter) {
            const parsedName = normalizeFontName(currentName);
            if (parsedName) fontNames.push(parsedName);
            currentName = '';
            continue;
        }

        currentName += character;
    }

    const parsedName = normalizeFontName(currentName);
    if (parsedName) fontNames.push(parsedName);
    return fontNames;
}

function normalizeFontName(fontName) {
    let normalizedName = String(fontName || '').trim();
    if ((normalizedName.startsWith('"') && normalizedName.endsWith('"')) || (normalizedName.startsWith("'") && normalizedName.endsWith("'"))) {
        normalizedName = normalizedName.slice(1, -1).trim();
    }
    return normalizedName;
}

function getPrimarySpecificFont(fontFamily) {
    const fontNames = parseFontFamilyList(fontFamily);
    return fontNames.find(fontName => !genericFontFamilies.has(fontName.toLowerCase())) || '';
}

function quoteFontFamilyName(fontName) {
    const escapedFontName = normalizeFontName(fontName).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escapedFontName}"`;
}

function measureFontWithCanvas(fontName) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;

    const quotedFontName = quoteFontFamilyName(fontName);
    const sampleTexts = [
        'mmmmmmmmmmlliWWWWW 0123456789',
        'The quick brown fox jumps over the lazy dog',
        'Comic Sans MS Arial Segoe UI Georgia Verdana',
    ];
    const baseFamilies = ['monospace', 'serif', 'sans-serif'];
    const fontSizes = [32, 72];

    for (const fontSize of fontSizes) {
        for (const sampleText of sampleTexts) {
            for (const baseFamily of baseFamilies) {
                context.font = `${fontSize}px ${baseFamily}`;
                const baseWidth = context.measureText(sampleText).width;
                context.font = `${fontSize}px ${quotedFontName}, ${baseFamily}`;
                const testWidth = context.measureText(sampleText).width;

                if (Math.abs(testWidth - baseWidth) > 0.1) {
                    return true;
                }
            }
        }
    }

    return false;
}

function measureFontWithDom(fontName) {
    if (!document.body) return false;

    const sampleTexts = [
        'mmmmmmmmmmlliWWWWW 0123456789',
        'The quick brown fox jumps over the lazy dog',
    ];
    const baseFamilies = ['monospace', 'serif', 'sans-serif'];
    const tester = document.createElement('span');
    const quotedFontName = quoteFontFamilyName(fontName);

    tester.style.position = 'absolute';
    tester.style.left = '-9999px';
    tester.style.top = '-9999px';
    tester.style.fontSize = '72px';
    tester.style.fontStyle = 'normal';
    tester.style.fontWeight = '400';
    tester.style.letterSpacing = '0';
    tester.style.whiteSpace = 'nowrap';
    document.body.appendChild(tester);

    for (const sampleText of sampleTexts) {
        const baseMeasurements = new Map();
        tester.textContent = sampleText;

        for (const baseFamily of baseFamilies) {
            tester.style.fontFamily = baseFamily;
            baseMeasurements.set(baseFamily, {
                width: tester.offsetWidth,
                height: tester.offsetHeight,
            });
        }

        for (const baseFamily of baseFamilies) {
            tester.style.fontFamily = `${quotedFontName}, ${baseFamily}`;
            const baseMeasurement = baseMeasurements.get(baseFamily);
            if (tester.offsetWidth !== baseMeasurement.width || tester.offsetHeight !== baseMeasurement.height) {
                tester.remove();
                return true;
            }
        }
    }

    tester.remove();
    return false;
}

function getCurrentPlatformKey() {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.userAgentData?.platform || navigator.platform || '';

    if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)) {
        return 'ios';
    }
    if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
        return 'windows';
    }
    if (/Mac/i.test(platform) || /Mac OS X/i.test(userAgent)) {
        return 'macos';
    }
    if (/Android/i.test(userAgent)) {
        return 'android';
    }
    if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
        return 'linux';
    }
    return 'unknown';
}

function isExpectedPlatformFont(fontName) {
    const platformFonts = platformFontHints.get(getCurrentPlatformKey());
    return platformFonts?.has(normalizeFontName(fontName).toLowerCase()) || false;
}

function getFontAvailabilityInCurrentBrowser(fontName) {
    const normalizedName = normalizeFontName(fontName);
    if (!normalizedName) {
        return { available: false, expectedPlatformFont: false };
    }

    const cacheKey = normalizedName.toLowerCase();
    if (fontAvailabilityCache.has(cacheKey)) {
        return fontAvailabilityCache.get(cacheKey);
    }

    const result = {
        available: measureFontWithCanvas(normalizedName) || measureFontWithDom(normalizedName),
        expectedPlatformFont: isExpectedPlatformFont(normalizedName),
    };

    fontAvailabilityCache.set(cacheKey, result);
    return result;
}

function getCurrentBrowserLabel() {
    const userAgent = navigator.userAgent || '';
    const platform = navigator.userAgentData?.platform || navigator.platform || '';

    if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)) {
        return 'this iOS/iPadOS browser';
    }
    if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
        return 'this Windows browser';
    }
    if (/Mac/i.test(platform) || /Mac OS X/i.test(userAgent)) {
        return 'this macOS browser';
    }
    if (/Android/i.test(userAgent)) {
        return 'this Android browser';
    }
    if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
        return 'this Linux browser';
    }
    return 'this browser';
}

function updateSystemFontAvailability() {
    const settings = getSettings();
    const status = $('#font_customizer_system_font_status');
    if (!status.length) return;

    const fontFamily = String(settings.fontFamily || '').trim();
    status.removeClass('available unavailable uncertain generic');

    if (!fontFamily) {
        status.text('Enter a system font to check availability in this browser.');
        return;
    }

    const fontNames = parseFontFamilyList(fontFamily);
    const primarySpecificFont = getPrimarySpecificFont(fontFamily);
    const browserLabel = getCurrentBrowserLabel();

    if (!primarySpecificFont) {
        status.addClass('generic');
        status.text(`${fontNames[0] || fontFamily} is a generic CSS family and should work in ${browserLabel}.`);
        return;
    }

    const availability = getFontAvailabilityInCurrentBrowser(primarySpecificFont);
    if (availability.available) {
        status.addClass('available');
        status.text(`${primarySpecificFont} appears to be available in ${browserLabel}.`);
    } else if (availability.expectedPlatformFont) {
        status.addClass('available');
        status.text(`${primarySpecificFont} is a common font for ${browserLabel}, but this browser check could not confirm it. If the preview uses it, it is working.`);
    } else {
        status.addClass('uncertain');
        status.text(`${primarySpecificFont} could not be confirmed in ${browserLabel}. If the preview looks right, it is being used.`);
    }
}

function saveAndApply() {
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
    applyFontStyles();
}

// ---- Event Handlers ----

function onEnabledChange() {
    const settings = getSettings();
    settings.enabled = $('#font_customizer_enabled').prop('checked');
    saveAndApply();
}

function onSourceChange() {
    const settings = getSettings();
    settings.source = String($('#font_customizer_source').val());
    toggleFontSourceUI(settings.source);
    saveAndApply();
}

function onFamilyChange() {
    const settings = getSettings();
    settings.fontFamily = String($('#font_customizer_family').val()).trim();
    updateSystemFontAvailability();
    saveAndApply();
}

function onSaveSystemFont() {
    const settings = getSettings();
    const fontName = settings.fontFamily;
    if (!fontName) return;
    if (!Array.isArray(settings.fontFamilyHistory)) {
        settings.fontFamilyHistory = [];
    }
    if (!settings.fontFamilyHistory.includes(fontName)) {
        settings.fontFamilyHistory.push(fontName);
        const { saveSettingsDebounced } = SillyTavern.getContext();
        saveSettingsDebounced();
        populateSystemFontHistory();
        toastr.success(`"${fontName}" saved to system font history.`);
    } else {
        toastr.info(`"${fontName}" is already in system font history.`);
    }
}

function onClearSystemHistory() {
    const settings = getSettings();
    settings.fontFamilyHistory = [];
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
    populateSystemFontHistory();
    toastr.info('System font history cleared.');
}

function populateSystemFontHistory() {
    const settings = getSettings();
    const select = $('#font_customizer_family_select');
    select.empty();
    select.append($('<option>').val('').text('-- Select a saved font --'));
    if (!Array.isArray(settings.fontFamilyHistory)) return;
    for (const font of settings.fontFamilyHistory) {
        const opt = $('<option>').val(font).text(font);
        if (font === settings.fontFamily) opt.prop('selected', true);
        select.append(opt);
    }
}

function onSystemFontSelectChange() {
    const selected = String($('#font_customizer_family_select').val());
    if (!selected) return;
    const settings = getSettings();
    settings.fontFamily = selected;
    $('#font_customizer_family').val(selected);
    updateSystemFontAvailability();
    saveAndApply();
}

function onGoogleFontChange() {
    const settings = getSettings();
    settings.googleFont = String($('#font_customizer_google_font').val()).trim();
    saveAndApply();
}

function onSaveGoogleFont() {
    const settings = getSettings();
    const fontName = settings.googleFont;
    if (!fontName) return;
    if (!Array.isArray(settings.googleFontHistory)) {
        settings.googleFontHistory = [];
    }
    if (!settings.googleFontHistory.includes(fontName)) {
        settings.googleFontHistory.push(fontName);
        const { saveSettingsDebounced } = SillyTavern.getContext();
        saveSettingsDebounced();
        populateGoogleFontHistory();
        toastr.success(`"${fontName}" saved to font history.`);
    } else {
        toastr.info(`"${fontName}" is already in font history.`);
    }
}

function onClearGoogleHistory() {
    const settings = getSettings();
    settings.googleFontHistory = [];
    const { saveSettingsDebounced } = SillyTavern.getContext();
    saveSettingsDebounced();
    populateGoogleFontHistory();
    toastr.info('Google Font history cleared.');
}

function populateGoogleFontHistory() {
    const settings = getSettings();
    const select = $('#font_customizer_google_font_select');
    select.empty();
    select.append($('<option>').val('').text('-- Select a saved font --'));
    if (!Array.isArray(settings.googleFontHistory)) return;
    for (const font of settings.googleFontHistory) {
        const opt = $('<option>').val(font).text(font);
        if (font === settings.googleFont) opt.prop('selected', true);
        select.append(opt);
    }
}

function onGoogleFontSelectChange() {
    const selected = String($('#font_customizer_google_font_select').val());
    if (!selected) return;
    const settings = getSettings();
    settings.googleFont = selected;
    $('#font_customizer_google_font').val(selected);
    saveAndApply();
}

function onFontSizeChange() {
    const settings = getSettings();
    const val = parseInt($('#font_customizer_size').val(), 10);
    settings.fontSize = val;
    $('#font_customizer_size_value').text(`${val}px`);
    saveAndApply();
}

function onLineHeightChange() {
    const settings = getSettings();
    const val = parseFloat($('#font_customizer_line_height').val());
    settings.lineHeight = val;
    $('#font_customizer_line_height_value').text(val.toFixed(1));
    saveAndApply();
}

function onLetterSpacingChange() {
    const settings = getSettings();
    const val = parseFloat($('#font_customizer_letter_spacing').val());
    settings.letterSpacing = val;
    $('#font_customizer_letter_spacing_value').text(val);
    saveAndApply();
}

function onScopeChange() {
    const settings = getSettings();
    settings.scope = String($('#font_customizer_scope').val());
    saveAndApply();
}

function onResetClick() {
    const { extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
    extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
    saveSettingsDebounced();
    loadSettingsUI();
    populateSystemFontHistory();
    populateGoogleFontHistory();
    applyFontStyles();
    toastr.info('Font settings have been reset to defaults.');
}

// ---- Initialization ----

/**
 * Activate hook entry point. Called by SillyTavern's extension loader
 * (manifest `hooks.activate`) on supported versions. Safe to call multiple
 * times — guarded by `_initialized`.
 */
export async function init() {
    if (_initialized) return;
    _initialized = true;

    try {
        // jQuery may not be ready yet if init() is called very early; wait for DOM ready.
        await new Promise(resolve => jQuery(resolve));

        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

        // Append to right column (visual/UI related extensions)
        $('#extensions_settings2').append(settingsHtml);

        // Bind event handlers
        $('#font_customizer_enabled').on('change', onEnabledChange);
        $('#font_customizer_source').on('change', onSourceChange);
        $('#font_customizer_family').on('input', onFamilyChange);
        $('#font_customizer_save_family').on('click', onSaveSystemFont);
        $('#font_customizer_clear_family_history').on('click', onClearSystemHistory);
        $('#font_customizer_family_select').on('change', onSystemFontSelectChange);
        $('#font_customizer_google_font').on('input', onGoogleFontChange);
        $('#font_customizer_save_google_font').on('click', onSaveGoogleFont);
        $('#font_customizer_clear_google_history').on('click', onClearGoogleHistory);
        $('#font_customizer_google_font_select').on('change', onGoogleFontSelectChange);
        $('#font_customizer_size').on('input', onFontSizeChange);
        $('#font_customizer_line_height').on('input', onLineHeightChange);
        $('#font_customizer_letter_spacing').on('input', onLetterSpacingChange);
        $('#font_customizer_scope').on('change', onScopeChange);
        $('#font_customizer_reset').on('click', onResetClick);

        // Load settings into UI and apply
        loadSettingsUI();
        populateSystemFontHistory();
        populateGoogleFontHistory();
        applyFontStyles();

        console.log(`[${MODULE_NAME}] Extension loaded.`);
    } catch (error) {
        // Reset guard so a retry (e.g. legacy fallback) can attempt again.
        _initialized = false;
        console.error(`[${MODULE_NAME}] Failed to initialize:`, error);
    }
}

/**
 * Clean hook entry point. Called by SillyTavern when the user opts in to
 * data cleanup (via the "Clean" button or the cleanup checkbox on uninstall).
 * Removes persisted settings and any DOM nodes injected by this extension.
 */
export async function clean() {
    try {
        const ctx = SillyTavern.getContext();
        if (ctx?.extensionSettings && Object.hasOwn(ctx.extensionSettings, MODULE_NAME)) {
            delete ctx.extensionSettings[MODULE_NAME];
            ctx.saveSettingsDebounced?.();
        }
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to clean settings:`, error);
    }

    // Remove injected DOM nodes (ST reloads the page after clean, but be tidy).
    document.getElementById('font_customizer_dynamic_style')?.remove();
    removeGoogleFontLink();

    console.log(`[${MODULE_NAME}] Extension data cleaned.`);
}

// Legacy fallback for SillyTavern versions that do not yet support the
// `hooks.activate` manifest field. On supported versions the activate hook
// fires first and `_initialized` prevents this from running a second time.
jQuery(() => { init(); });
