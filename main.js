// main.js
// Haupteinstiegspunkt der Anwendung. Initialisiert Module, verwaltet den globalen Zustand und startet die Update-Schleife.

import {
    latitude,
    longitude,
    calculationMethod,
    hijriMonthMap,
} from './config.js';
import { getCurrentTime, parsePrayerTime } from './timeUtils.js';
import {
    fetchPrayerTimes,
    fetchCurrentIslamicDate,
    fetchIslamicDateForTomorrow,
} from './api.js';
import { findPrayerToHighlight, findNextPrayer } from './prayerLogic.js';
import {
    updatePrayerTimesUI,
    displayError,
    highlightPrayer,
    updateNextPrayerTimerDisplay,
    updateIslamicDateUI,
    setJumaaTimeUI,
    setIshaTimeUI,
    updateUI,
    updateDateTimeDisplay,
} from './ui.js';
import { initializeDebugControls, loadDataAndRefreshUI as reloadDataFromDebug } from './debug.js'; // Importiere die Reload-Funktion aus debug

// --- Globaler Zustand ---
export let timeOffset = 0;
export let prayerTimesData = {};
export let initialDataLoaded = false;
export let lastCheckedGregorianDate = null; // Umbenannt für Klarheit
export let midnightUpdateTimer = null;
export let displayedIslamicDate = null;
export let lastHighlightUpdateMinute = -1;
let isFetchingIslamicDate = false; // Flag, um parallele Fetches zu verhindern

// --- DOM Elemente cachen ---
export const elements = {
    hoursAndMin: document.getElementById('hoursAndMin'),
    seconds: document.getElementById('seconds'),
    currentDate: document.getElementById('current-date'),
    islamicDate: document.getElementById('islamic-date'),
    nextPrayer: document.getElementById('nextPrayer'),
    nextPrayerIcon: document.getElementById('nextPrayerIcon'),
};
export const debugElements = {
    overrideTimeInput: document.getElementById('override-time-input'),
    overrideDateInput: document.getElementById('override-date-input'),
    setOverrideBtn: document.getElementById('set-override-time-btn'),
    resetRealTimeBtn: document.getElementById('reset-real-time-btn'),
    currentTimeStatus: document.getElementById('current-time-status'),
};

// --- Setter-Funktionen für den globalen Zustand ---
export function setPrayerTimesData(data) {
    prayerTimesData = data;
}
export function setInitialDataLoaded(value) {
    console.log(`Setting initialDataLoaded to: ${value}`);
    initialDataLoaded = value;
}
export function setLastHighlightMinute(value) {
    // console.log(`Setting lastHighlightUpdateMinute to: ${value}`); // Kann man auskommentieren
    lastHighlightUpdateMinute = value;
}
export function setDisplayedIslamicDate(value) {
    displayedIslamicDate = value;
}
// ----------------------------------------------------

/**
 * Prüft, ob das angezeigte islamische Datum aktualisiert werden muss
 * (z.B. nach Maghrib oder nach Mitternacht).
 */
function checkAndUpdateIslamicDate() {
    if (!initialDataLoaded || isFetchingIslamicDate) {
        return; // Nicht ausführen während initialem Laden oder wenn schon ein Fetch läuft
    }

    const now = getCurrentTime();
    const maghribTimeStr = prayerTimesData['Maghrib'];
    if (!maghribTimeStr) return; // Brauchen Maghrib-Zeit

    const maghribTime = parsePrayerTime(maghribTimeStr, now);
    if (!maghribTime) return;

    let expectedDateFetchPromise = null;
    let dateType = ""; // Für Debugging

    if (now >= maghribTime) {
        // Nach Maghrib -> Erwarte Datum von morgen
        dateType = "morgen";
        expectedDateFetchPromise = fetchIslamicDateForTomorrow(now);
    } else {
        // Vor Maghrib -> Erwarte Datum von heute
        dateType = "heute";
        expectedDateFetchPromise = fetchCurrentIslamicDate();
    }

    isFetchingIslamicDate = true; // Setze Flag
    expectedDateFetchPromise
        .then(expectedHijriData => {
            if (expectedHijriData) {
                // Erstelle den erwarteten Datumsstring
                const expectedDay = expectedHijriData.day;
                const expectedMonth = expectedHijriData.month.en; // Vergleich mit englischem Monat ist einfacher
                const expectedYear = expectedHijriData.year;
                // Vereinfachter Vergleich: Nur Tag, Monat (Englisch), Jahr
                const expectedDateSimple = `${expectedDay}-${expectedMonth}-${expectedYear}`;

                // Erstelle einen vergleichbaren String aus dem aktuell angezeigten Datum
                // Dies ist fehleranfällig, wenn das Format von displayedIslamicDate sich ändert!
                // Besser wäre, das letzte *geladene* Hijri-Objekt zu speichern.
                // Fürs Erste versuchen wir es mit dem String-Vergleich:
                let currentDisplayedSimple = null;
                if (displayedIslamicDate) {
                    // Versuche, Tag, Monat (Deutsch), Jahr zu extrahieren und Monat zu übersetzen
                    try {
                        const parts = displayedIslamicDate.match(/(\d+)\.\s(.+)\s(\d+)\sH/);
                        if (parts) {
                            const day = parts[1];
                            const monthDe = parts[2];
                            const year = parts[3];
                            // Finde den englischen Monat zum deutschen Namen (Umkehrung der Map)
                            const monthEn = Object.keys(hijriMonthMap).find(key => hijriMonthMap[key] === monthDe);
                            if (monthEn) {
                                currentDisplayedSimple = `${day}-${monthEn}-${year}`;
                            }
                        }
                    } catch (e) { console.error("Fehler beim Parsen des angezeigten Datums:", e); }
                }

                // console.log(`Check Islamic Date: Now=${dateType}, Expected=${expectedDateSimple}, Displayed=${currentDisplayedSimple}`); // Debug

                // Nur updaten, wenn das erwartete Datum nicht dem aktuell angezeigten entspricht
                if (expectedDateSimple !== currentDisplayedSimple) {
                    console.log(`>>> Islamisches Datum Update NÖTIG (${dateType}). Erwartet: ${expectedDateSimple}, Angezeigt: ${currentDisplayedSimple}`);
                    updateIslamicDateUI(expectedHijriData); // UI aktualisieren
                }
            }
        })
        .catch(error => {
            console.error(`Fehler beim Holen des erwarteten islamischen Datums (${dateType}):`, error);
        })
        .finally(() => {
            isFetchingIslamicDate = false; // Flag zurücksetzen
        });
}


/**
 * Überprüft nur den gregorianischen Mitternachtswechsel im laufenden Betrieb.
 */
function checkGregorianDateChange() {
    if (!initialDataLoaded) return;

    const now = getCurrentTime();
    const currentDateStr = now.toDateString();

    if (lastCheckedGregorianDate && currentDateStr !== lastCheckedGregorianDate) {
        console.log('GREGORIANISCHER DATUMSWECHSEL ERKANNT - Lade neue Daten');
        // Rufe die Funktion aus debug.js auf, um alles neu zu laden
        // Dies stellt sicher, dass auch der Debug-Status korrekt behandelt wird.
        reloadDataFromDebug(); // Verwende die Funktion aus debug.js
        scheduleMidnightUpdate(); // Timer neu planen
    }
    lastCheckedGregorianDate = currentDateStr;
}

/**
 * Plant das nächste automatische Update um Mitternacht.
 */
function scheduleMidnightUpdate() {
    // Funktion bleibt unverändert
    if (midnightUpdateTimer) {
        clearTimeout(midnightUpdateTimer);
    }
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 1, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    console.log(
        `Timer für Mitternachts-Update gesetzt: Nächstes Update in ${Math.floor(
            msUntilMidnight / 1000 / 60
        )} Minuten.`
    );
    midnightUpdateTimer = setTimeout(() => {
        console.log('MITTERNACHT ERREICHT - Lade neue Daten für neuen Tag');
        reloadDataFromDebug(); // Verwende die Funktion aus debug.js
        scheduleMidnightUpdate();
    }, msUntilMidnight);
}

/**
 * Lädt die initialen Gebetszeiten und das passende islamische Datum.
 * Wird beim Start und bei Datumswechseln aufgerufen.
 */
export function loadInitialData() { // Exportieren, damit debug.js sie aufrufen kann
    setInitialDataLoaded(false);
    setLastHighlightMinute(-1);
    isFetchingIslamicDate = false; // Reset fetch flag
    displayError("Lade Gebetszeiten...");
    if (elements.islamicDate) elements.islamicDate.textContent = "Lade...";

    fetchPrayerTimes(latitude, longitude, calculationMethod)
        .then((times) => {
            if (!times) {
                throw new Error("Gebetszeiten konnten nicht abgerufen werden.");
            }
            setPrayerTimesData(times);
            updatePrayerTimesUI(times);
            setJumaaTimeUI('13:30');
            // setIshaTimeUI("20:30");

            const nowInitial = getCurrentTime();
            const maghribTimeStr = times['Maghrib'];
            const maghribTime = parsePrayerTime(maghribTimeStr, nowInitial);

            if (maghribTime && nowInitial >= maghribTime) {
                console.log("Initial Load: Nach Maghrib, lade Datum für morgen.");
                return fetchIslamicDateForTomorrow(nowInitial);
            } else {
                console.log("Initial Load: Vor Maghrib oder Fallback, lade Datum für heute.");
                return fetchCurrentIslamicDate();
            }
        })
        .then(hijriData => {
            if (hijriData) {
                updateIslamicDateUI(hijriData); // Setzt auch displayedIslamicDate
            } else {
                 console.warn("Islamisches Datum konnte initial nicht geladen werden.");
                 if (elements.islamicDate) elements.islamicDate.textContent = "Fehler";
                 setDisplayedIslamicDate(null); // Sicherstellen, dass es null ist
            }
            setInitialDataLoaded(true);
            lastCheckedGregorianDate = getCurrentTime().toDateString();
            console.log("Initiale Daten geladen.");
            updateUI(); // Einmaliges Update für Highlight/Countdown
        })
        .catch((error) => {
            console.error('Fehler beim initialen Laden:', error.message);
            displayError(error.message || 'Fehler beim Laden der Daten.');
            setInitialDataLoaded(false);
            setPrayerTimesData({});
            setDisplayedIslamicDate(null);
            if (elements.islamicDate) elements.islamicDate.textContent = "Fehler";
        });
}

/**
 * Haupt-Update-Schleife, wird jede Sekunde aufgerufen.
 */
function updateLoop() {
    // Aktualisiert Uhrzeit/greg. Datum immer
    updateDateTimeDisplay();

    // Aktualisiert Highlight/Countdown nur wenn Daten geladen sind
    if (initialDataLoaded) {
        updateUI();
        checkAndUpdateIslamicDate(); // Prüft, ob islamisches Datum aktualisiert werden muss
        checkGregorianDateChange(); // Prüft auf gregorianischen Datumswechsel
    }
}

// --- Initialisierung beim Laden der Seite ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM geladen. Initialisiere Anwendung...');
    // Wichtig: Debug Controls *vor* loadInitialData initialisieren,
    // damit die override-Werte ggf. schon gesetzt sind.
    initializeDebugControls();

    // Uhrzeit sofort anzeigen
    updateDateTimeDisplay();

    loadInitialData(); // Starte den Ladevorgang

    // Starte die sekündliche Schleife
    setInterval(updateLoop, 1000);

    scheduleMidnightUpdate(); // Plane Mitternachts-Update
    console.log('Anwendung initialisiert.');
});
