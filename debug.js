// debug.js
// Enthält die Logik und Zustandsvariablen für die Test-Zeitsteuerung.

import {
    latitude,
    longitude,
    calculationMethod,
    hijriMonthMap, // Importiere die Map für die UI-Funktion
} from './config.js';
// Entferne API-Imports, da das Laden jetzt zentral in main.js passiert
// import { fetchPrayerTimes, fetchCurrentIslamicDate } from './api.js';
import {
    updateUI,
    updatePrayerTimesUI,
    setJumaaTimeUI,
    updateIslamicDateUI,
    displayError,
} from './ui.js';
import {
    // Importiere die zentrale Ladefunktion
    loadInitialData,
    // Importiere Setter und Elemente wie zuvor
    setPrayerTimesData,
    setInitialDataLoaded,
    setLastHighlightMinute,
    debugElements,
    elements, // Wird für updateIslamicDateUI benötigt
    setDisplayedIslamicDate, // Wird für updateIslamicDateUI benötigt
} from './main.js';

// Debug-Statusvariablen (werden hier verwaltet und exportiert)
export let useOverrideTime = false;
export let overrideTime = null;
export let overrideTimeSetAt = null;
export let useOverrideDate = false;
export let overrideDate = null;

/**
 * Aktualisiert die Statusanzeige der Test-Zeitsteuerung.
 */
function updateStatusDisplay() {
    // Funktion bleibt unverändert
    let statusText = '';
    let statusColor = 'lightgreen';
    if (useOverrideDate && useOverrideTime) {
        statusText = `Testdatum: ${overrideDate.toLocaleDateString('de-DE')} & Testzeit`;
        statusColor = 'orange';
    } else if (useOverrideDate) {
        statusText = `Testdatum: ${overrideDate.toLocaleDateString('de-DE')}`;
        statusColor = 'orange';
    } else if (useOverrideTime) {
        statusText = 'Testzeit';
        statusColor = 'orange';
    } else {
        statusText = 'Echtzeit';
        statusColor = 'lightgreen';
    }
    if (debugElements.currentTimeStatus) {
        debugElements.currentTimeStatus.textContent = statusText;
        debugElements.currentTimeStatus.style.color = statusColor;
    }
}

/**
 * Verarbeitet die Eingaben für Testdatum und -zeit und aktiviert diese.
 * Ruft dann die zentrale Ladefunktion auf.
 */
function setOverrideTime() {
    // Datum verarbeiten (Logik bleibt gleich)
    if (debugElements.overrideDateInput) {
        const dateInput = debugElements.overrideDateInput.value.trim();
        if (dateInput) {
            overrideDate = new Date(dateInput);
            if (isNaN(overrideDate.getTime())) {
                 alert('Ungültiges Datumformat.');
                 overrideDate = null;
                 useOverrideDate = false;
            } else {
                useOverrideDate = true;
            }
        } else {
             useOverrideDate = false;
             overrideDate = null;
        }
    }

    // Zeit verarbeiten (Logik bleibt gleich)
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
            alert('Bitte geben Sie eine gültige Zeit ein (Stunden: 0-23, Minuten: 0-59, Sekunden: 0-59).');
            return;
        }
        const base = overrideDate || new Date();
        overrideTime = new Date(base);
        overrideTime.setHours(hours, minutes, seconds);
        overrideTimeSetAt = new Date();
        useOverrideTime = true;
    } else {
        useOverrideTime = false;
        overrideTime = null;
        overrideTimeSetAt = null;
    }

    // UI aktualisieren und zentrale Ladefunktion aufrufen
    updateStatusDisplay();
    console.log(
        'Testeinstellungen aktiviert - Datum:',
        useOverrideDate ? overrideDate.toLocaleDateString('de-DE') : 'Echtzeit',
        'Zeit:',
        useOverrideTime ? timeInput : 'Echtzeit'
    );

    // *** ÄNDERUNG: Rufe loadInitialData aus main.js auf ***
    loadInitialData();
    setLastHighlightMinute(-1); // Erzwinge Highlight-Update
}

/**
 * Setzt die Zeitsteuerung auf Echtzeit zurück.
 * Ruft dann die zentrale Ladefunktion auf.
 */
function resetToRealTime() {
    useOverrideTime = false;
    overrideTime = null;
    overrideTimeSetAt = null;
    useOverrideDate = false;
    overrideDate = null;

    updateStatusDisplay();
    console.log('Zurück zur Echtzeit');

    // *** ÄNDERUNG: Rufe loadInitialData aus main.js auf ***
    loadInitialData();
    setLastHighlightMinute(-1); // Erzwinge Highlight-Update
}

/**
 * Exportiere die Funktion, die von main.js aufgerufen wird, um alles neu zu laden.
 * Diese Funktion ruft einfach loadInitialData auf.
 */
export function loadDataAndRefreshUI() {
    console.log("loadDataAndRefreshUI called from debug.js (likely due to date change)");
    loadInitialData();
}


/**
 * Initialisiert die Debug-Steuerungselemente und Event Listener.
 */
export function initializeDebugControls() {
    // Funktion bleibt unverändert
    if (debugElements.overrideDateInput) {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
}
