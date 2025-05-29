// debug.js
// Enthält die Logik und Zustandsvariablen für die Test-Zeitsteuerung.

// config.js Importe bleiben
import {
    latitude,
    longitude,
    calculationMethod,
    hijriMonthMap,
} from './config.js';
// ui.js Importe bleiben
import {
    updateUI,
    updatePrayerTimesUI,
    setJumaaTimeUI,
    updateIslamicDateUI,
    displayError,
} from './ui.js';
// main.js Importe anpassen
import {
    loadInitialData, // Zentrale Ladefunktion
    setPrayerTimesData, // Wird hier nicht direkt verwendet, aber konsistent
    setInitialDataLoaded, // Wird hier nicht direkt verwendet
    setLastHighlightMinute, // Wichtig für UI-Refresh
    debugElements, // KORREKT: Wird jetzt von main.js exportiert
    elements, // Wird von updateIslamicDateUI benötigt
    // setDisplayedIslamicDate, // ENTFERNT: UI setzt jetzt das Objekt über main.js
    timeOffset as globalTimeOffset, // Importiere und benenne um, um Konflikt zu vermeiden
} from './main.js';

// Debug-Statusvariablen
export let useOverrideTime = false;
export let overrideTime = null;
export let overrideTimeSetAt = null; // Zeitstempel, wann overrideTime gesetzt wurde
export let useOverrideDate = false;
export let overrideDate = null; // Das überschriebene Datum als Date-Objekt

// Setter für timeOffset aus main.js (indirekt über getCurrentTime)
// Wir müssen timeOffset in main.js aktualisieren.
// Da wir es nicht direkt importieren können, um es zu ändern (ES6 Module sind live, aber nicht direkt beschreibbar von außen),
// brauchen wir eine Funktion in main.js, um es zu setzen, oder wir exportieren timeOffset als Objekt.
// Für diese Lösung: Wir nehmen an, dass getCurrentTime in timeUtils.js auf das exportierte timeOffset aus main.js zugreift.
// Und wir brauchen eine Möglichkeit, timeOffset in main.js zu aktualisieren.
// Einfachste Lösung für jetzt: debug.js setzt sein eigenes timeOffset, und timeUtils.js muss dieses verwenden.
// Besser: main.js exportiert eine Funktion setTimeOffset.

// In main.js: export function setGlobalTimeOffset(newOffset) { timeOffset = newOffset; }
// In debug.js: import { setGlobalTimeOffset } from './main.js';
// Dann in debug.js: setGlobalTimeOffset(berechneterOffset);
// Für jetzt: Wir gehen davon aus, dass timeUtils.js das timeOffset aus main.js liest
// und wir müssen es in main.js aktualisieren. Da das nicht direkt geht,
// ist die beste Lösung, dass main.js eine Funktion exportiert, um timeOffset zu setzen.
// Da du das nicht hast, machen wir es so, dass debug.js das timeOffset in main.js
// indirekt über eine Neulade-Logik beeinflusst, die dann getCurrentTime neu bewertet.

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
                overrideDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (isNaN(overrideDate.getTime())) {
                    alert('Ungültiges Datumformat. Bitte YYYY-MM-DD verwenden.');
                    overrideDate = null;
                    useOverrideDate = false;
                } else {
                    useOverrideDate = true;
                }
            } else {
                alert('Ungültiges Datumformat. Bitte YYYY-MM-DD verwenden.');
                overrideDate = null;
                useOverrideDate = false;
            }
        } else {
            useOverrideDate = false;
            overrideDate = null;
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
        // Wichtig: overrideTime sollte die Zeitkomponenten des baseDate setzen,
        // aber das Datum von baseDate beibehalten.
        overrideTime = new Date(baseDate); // Kopiert das Datum von baseDate
        overrideTime.setHours(hours, minutes, seconds, 0); // Setzt nur die Zeit

        overrideTimeSetAt = new Date(); // Echte aktuelle Zeit, wann Override gesetzt wurde
        useOverrideTime = true;
    } else {
        useOverrideTime = false;
        overrideTime = null;
        overrideTimeSetAt = null;
    }

    updateStatusDisplay();
    console.log(
        'Testeinstellungen aktiviert - Datum:',
        useOverrideDate && overrideDate ? overrideDate.toLocaleDateString('de-DE') : 'Echtzeit',
        'Zeit:',
        useOverrideTime ? timeInput : 'Echtzeit'
    );

    // Daten neu laden mit den Override-Einstellungen
    // loadInitialData wird jetzt die korrekte Zeit über getCurrentTime (via timeUtils.js) bekommen.
    loadInitialData();
    setLastHighlightMinute(-1); // Erzwinge Highlight-Update
}

/**
 * Setzt die Zeitsteuerung auf Echtzeit zurück.
 */
function resetToRealTime() {
    useOverrideTime = false;
    overrideTime = null;
    overrideTimeSetAt = null;
    useOverrideDate = false;
    overrideDate = null;

    updateStatusDisplay();
    console.log('Zurück zur Echtzeit');

    loadInitialData();
    setLastHighlightMinute(-1);
}

/**
 * Diese Funktion wird von main.js aufgerufen, wenn sich das gregorianische Datum ändert (Mitternacht).
 * Sie soll sicherstellen, dass die Daten neu geladen werden, unter Berücksichtigung des Debug-Status.
 */
export function loadDataAndRefreshUI() {
    // console.log("loadDataAndRefreshUI in debug.js aufgerufen (wahrscheinlich durch Mitternachtswechsel in main.js)");
    // Die Kernlogik ist, loadInitialData aufzurufen, da diese Funktion
    // getCurrentTime verwendet, welche wiederum den Debug-Status berücksichtigt.
    loadInitialData();
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

// Es ist wichtig, dass timeUtils.js `timeOffset` aus `main.js` korrekt verwendet.
// Da `debug.js` `timeOffset` nicht direkt setzt, muss `getCurrentTime` in `timeUtils.js`
// die exportierten `useOverrideTime`, `overrideTime`, `overrideTimeSetAt`, `useOverrideDate`, `overrideDate`
// aus DIESER `debug.js`-Datei verwenden, um die korrekte Zeit zu ermitteln.

// In timeUtils.js:
/*
import { timeOffset as globalTimeOffset } from './main.js'; // Das ist der Offset aus main.js
import {
    useOverrideTime,
    overrideTime,
    overrideTimeSetAt,
    useOverrideDate,
    overrideDate
} from './debug.js'; // Importiere Debug-Status

export function getCurrentTime() {
    if (useOverrideTime && overrideTime && overrideTimeSetAt) {
        const now = new Date();
        const diffSinceOverrideSet = now.getTime() - overrideTimeSetAt.getTime();
        const currentOverriddenTime = new Date(overrideTime.getTime() + diffSinceOverrideSet);
        if (useOverrideDate && overrideDate) {
            // Kombiniere Datum von overrideDate mit Zeit von currentOverriddenTime
            return new Date(
                overrideDate.getFullYear(),
                overrideDate.getMonth(),
                overrideDate.getDate(),
                currentOverriddenTime.getHours(),
                currentOverriddenTime.getMinutes(),
                currentOverriddenTime.getSeconds()
            );
        }
        return currentOverriddenTime;
    }
    if (useOverrideDate && overrideDate) {
        // Verwende overrideDate mit aktueller realer Zeit
        const realNow = new Date();
        return new Date(
            overrideDate.getFullYear(),
            overrideDate.getMonth(),
            overrideDate.getDate(),
            realNow.getHours(),
            realNow.getMinutes(),
            realNow.getSeconds()
        );
    }
    // Kein Override, verwende echte Zeit + globalen Offset (falls vorhanden)
    const now = new Date();
    return new Date(now.getTime() + (globalTimeOffset || 0) * 60 * 60 * 1000);
}
*/
