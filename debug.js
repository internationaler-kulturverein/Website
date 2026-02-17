// debug.js
// Enthält die Logik und Zustandsvariablen für die Test-Zeitsteuerung.

import {
    setLastHighlightMinute,
    debugElements,
    useOverrideTime,
    overrideTime,
    useOverrideDate,
    overrideDate,
    setOverrideTimeState,
    setOverrideDateState,
} from './state.js';

// --- Callback-Pattern zur Auflösung der zirkulären Abhängigkeit mit main.js ---
let reloadDataCallback = null;
export function registerReloadCallback(callback) {
    reloadDataCallback = callback;
}

function invokeReloadData() {
    if (typeof reloadDataCallback === 'function') {
        reloadDataCallback();
    } else {
        console.error('reloadDataCallback ist nicht registriert. Bitte registerReloadCallback() aufrufen.');
    }
}

/**
 * Aktualisiert die Statusanzeige der Test-Zeitsteuerung.
 */
function updateStatusDisplay() {
    let statusText = '';
    let statusColor = 'lightgreen';
    if (useOverrideDate && useOverrideTime && overrideDate && overrideTime) {
        statusText = `Testdatum: ${overrideDate.toLocaleDateString('de-DE')} & Testzeit`;
        statusColor = 'orange';
    } else if (useOverrideDate && overrideDate) {
        statusText = `Testdatum: ${overrideDate.toLocaleDateString('de-DE')}`;
        statusColor = 'orange';
    } else if (useOverrideTime) {
        statusText = 'Testzeit';
        statusColor = 'orange';
    } else {
        statusText = 'Echtzeit';
    }
    if (debugElements.currentTimeStatus) {
        debugElements.currentTimeStatus.textContent = statusText;
        debugElements.currentTimeStatus.style.color = statusColor;
    }
}

/**
 * Verarbeitet die Eingaben für Testdatum und -zeit und aktiviert diese.
 */
function setOverrideTime() {
    // Datum verarbeiten
    if (debugElements.overrideDateInput) {
        const dateInput = debugElements.overrideDateInput.value.trim();
        if (dateInput) {
            // Versuche, das Datum im Format YYYY-MM-DD zu parsen
            const parts = dateInput.split('-');
            if (parts.length === 3) {
                const overrideDateTemp = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (isNaN(overrideDateTemp.getTime())) {
                    alert('Ungültiges Datumformat. Bitte YYYY-MM-DD verwenden.');
                    setOverrideDateState(false, null);
                } else {
                    setOverrideDateState(true, overrideDateTemp);
                }
            } else {
                alert('Ungültiges Datumformat. Bitte YYYY-MM-DD verwenden.');
                setOverrideDateState(false, null);
            }
        } else {
            setOverrideDateState(false, null);
        }
    }

    // Zeit verarbeiten
    const timeInput = debugElements.overrideTimeInput.value.trim();
    if (timeInput) {
        if (!timeInput.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?$/)) {
            alert('Bitte geben Sie eine gültige Zeit im Format HH:MM:SS oder HH:MM ein.');
            return;
        }
        const timeParts = timeInput.split(':').map((part) => parseInt(part, 10));
        const hours = timeParts[0];
        const minutes = timeParts[1];
        const seconds = timeParts.length > 2 ? timeParts[2] : 0;

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
            alert('Bitte geben Sie eine gültige Zeit ein.');
            return;
        }

        // Basis für die Zeit ist entweder das overrideDate oder das aktuelle Datum
        const baseDate = useOverrideDate && overrideDate ? new Date(overrideDate) : new Date();
        // State Update via Setter
        const newOverrideTime = new Date(baseDate);
        newOverrideTime.setHours(hours, minutes, seconds, 0);
        setOverrideTimeState(true, newOverrideTime, new Date());
    } else {
        setOverrideTimeState(false, null, null);
    }

    updateStatusDisplay();

    // Daten neu laden mit den Override-Einstellungen
    invokeReloadData();
    setLastHighlightMinute(-1); // Erzwinge Highlight-Update
}

/**
 * Setzt die Zeitsteuerung auf Echtzeit zurück.
 */
function resetToRealTime() {
    setOverrideTimeState(false, null, null);
    setOverrideDateState(false, null);

    updateStatusDisplay();

    invokeReloadData();
    setLastHighlightMinute(-1);
}

/**
 * Diese Funktion wird von main.js aufgerufen, wenn sich das gregorianische Datum ändert (Mitternacht).
 * Sie soll sicherstellen, dass die Daten neu geladen werden, unter Berücksichtigung des Debug-Status.
 */
export function loadDataAndRefreshUI() {
    // Die Kernlogik ist, loadInitialData aufzurufen, da diese Funktion
    // getCurrentTime verwendet, welche wiederum den Debug-Status berücksichtigt.
    invokeReloadData();
}

/**
 * Initialisiert die Debug-Steuerungselemente und Event Listener.
 */
export function initializeDebugControls() {
    if (debugElements.overrideDateInput) {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        debugElements.overrideDateInput.value = formattedDate;
    }
    if (debugElements.setOverrideBtn) {
        debugElements.setOverrideBtn.addEventListener('click', setOverrideTime);
    }
    if (debugElements.resetRealTimeBtn) {
        debugElements.resetRealTimeBtn.addEventListener('click', resetToRealTime);
    }
    const closeDebugBtn = document.getElementById('close-debug-btn');
    if (closeDebugBtn) {
        closeDebugBtn.addEventListener('click', function () {
            const debugPanel = document.getElementById('debug-controls');
            if (debugPanel) {
                debugPanel.style.display = 'none';
            }
        });
    }
    updateStatusDisplay(); // Initialen Status anzeigen
}

// End of debug.js
