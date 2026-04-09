// SillyTavern Font Customizer Extension
// Allows users to customize font family, size, line height, and letter spacing.

const MODULE_NAME = 'font_customizer';
const extensionFolderPath = `scripts/extensions/third-party/st_font`;

const defaultSettings = Object.freeze({
    enabled: false,
    source: 'system',        // 'system' or 'google'
    fontFamily: '',           // system/generic font family
    googleFont: '',           // Google Fonts font name
    googleFontHistory: [],    // saved Google Font names
    fontSize: 0,              // 0 = use default
    lineHeight: 0,            // 0 = use default
    letterSpacing: 0,
    scope: 'chat',            // 'chat' or 'ui'
});

let currentGoogleFontLink = null;

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
            extensionSettings[MODULE_NAME][key] = defaultSettings[key];
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
        css = `body {\n    ${cssBlock}\n}`;
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
    const datalist = $('#font_customizer_google_font_list');
    datalist.empty();
    if (!Array.isArray(settings.googleFontHistory)) return;
    for (const font of settings.googleFontHistory) {
        datalist.append($('<option>').val(font));
    }
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
    applyFontStyles();
    toastr.info('Font settings have been reset to defaults.');
}

// ---- Initialization ----

jQuery(async () => {
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

    // Append to right column (visual/UI related extensions)
    $('#extensions_settings2').append(settingsHtml);

    // Bind event handlers
    $('#font_customizer_enabled').on('change', onEnabledChange);
    $('#font_customizer_source').on('change', onSourceChange);
    $('#font_customizer_family').on('input', onFamilyChange);
    $('#font_customizer_google_font').on('input', onGoogleFontChange);
    $('#font_customizer_save_google_font').on('click', onSaveGoogleFont);
    $('#font_customizer_clear_google_history').on('click', onClearGoogleHistory);
    $('#font_customizer_size').on('input', onFontSizeChange);
    $('#font_customizer_line_height').on('input', onLineHeightChange);
    $('#font_customizer_letter_spacing').on('input', onLetterSpacingChange);
    $('#font_customizer_scope').on('change', onScopeChange);
    $('#font_customizer_reset').on('click', onResetClick);

    // Load settings into UI and apply
    loadSettingsUI();
    populateGoogleFontHistory();
    applyFontStyles();

    console.log(`[${MODULE_NAME}] Extension loaded.`);
});
