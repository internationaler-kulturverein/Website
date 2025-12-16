// main.js
// Haupteinstiegspunkt der Anwendung.

import {
    latitude,
    longitude,
    calculationMethod,
    hijriMonthMap,
    hijriMonthOrder,
    HIJRI_MODE,
    MANUAL_SETTINGS,
} from './config.js';
import { getCurrentTime, parsePrayerTime } from './timeUtils.js';
import {
    fetchPrayerTimes,
    fetchCurrentIslamicDate as fetchApiCurrentIslamicDate,
    fetchIslamicDateForTomorrow as fetchApiIslamicDateForTomorrow,
} from './api.js';
import { findPrayerToHighlight, findNextPrayer } from './prayerLogic.js';
import {
    updatePrayerTimesUI,
    displayError,
    highlightPrayer,
    updateNextPrayerTimerDisplay,
    updateIslamicDateUI,
    setJumaaTimeUI,
    setIshaTimeUI, // Add this line
    updateUI,
    updateTimeDisplay,
    updateDateDisplay,
} from './ui.js';
import { initializeDebugControls, loadDataAndRefreshUI as reloadDataFromDebug } from './debug.js';

// --- Globaler Zustand ---
export let timeOffset = 0;
export let prayerTimesData = {};
export let initialDataLoaded = false;
export let lastCheckedGregorianDate = null;
export let midnightUpdateTimer = null;
export let displayedIslamicDateObject = null;
export let lastHighlightUpdateMinute = -1;
let loadRetryCount = 0;
const MAX_RETRIES = 3;
let isFetchingIslamicDate = false;
let currentHijriMode = HIJRI_MODE;

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

// --- Setter-Funktionen ---
export function setPrayerTimesData(data) { prayerTimesData = data; }
export function setInitialDataLoaded(value) { initialDataLoaded = value; }
export function setLastHighlightMinute(value) { lastHighlightUpdateMinute = value; }
export function setDisplayedIslamicDateObject(data) { displayedIslamicDateObject = data; }
// ----------------------------------------------------

function getTomorrowDate(today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}

/**
 * KORRIGIERT V3: Berechnet das Hijri-Datum im manuellen Modus.
 * START_GREGORIAN_DATE_STR ist der Tag, an dessen Abend der START_HIJRI_DAY beginnt.
 * @param {Date} gregorianDateForCalculation - Das gregorianische Datum, für das berechnet wird (Maghrib bereits berücksichtigt!).
 * @returns {object|null} Hijri-Datumsobjekt oder null.
 */
function calculateManualHijriDate(gregorianDateForCalculation) {
    if (!MANUAL_SETTINGS || !MANUAL_SETTINGS.START_GREGORIAN_DATE_STR ||
        typeof MANUAL_SETTINGS.START_HIJRI_DAY !== 'number' ||
        !MANUAL_SETTINGS.START_HIJRI_MONTH_KEY ||
        typeof MANUAL_SETTINGS.START_HIJRI_YEAR !== 'number') {
        console.error("Manuelle Einstellungen (MANUAL_SETTINGS) in config.js fehlen oder sind fehlerhaft.");
        return null;
    }

    try {
        // 1. Anker-Datum (lokale Zeit, Mitternacht)
        // START_GREGORIAN_DATE_STR ist der Tag, an dessen *Abend* der START_HIJRI_DAY beginnt.
        const anchorParts = MANUAL_SETTINGS.START_GREGORIAN_DATE_STR.split('-');
        const anchorDayStartLocal = new Date(
            parseInt(anchorParts[0]),
            parseInt(anchorParts[1]) - 1, // Monat ist 0-basiert
            parseInt(anchorParts[2]),
            0, 0, 0, 0 // Setze auf lokale Mitternacht
        );

        if (isNaN(anchorDayStartLocal.getTime())) {
            console.error("Ungültiges START_GREGORIAN_DATE_STR in MANUAL_SETTINGS.");
            return null;
        }

        // 2. Effektives Berechnungsdatum (lokale Zeit, Mitternacht)
        // gregorianDateForCalculation ist bereits für Maghrib korrigiert.
        const effectiveCalcDayStartLocal = new Date(gregorianDateForCalculation);
        effectiveCalcDayStartLocal.setHours(0, 0, 0, 0); // Normalisiere auf lokale Mitternacht

        // 3. Differenz in Tagen
        const msPerDay = 1000 * 60 * 60 * 24;
        // Die Differenz in Millisekunden. getTime() gibt UTC-Millisekunden, aber da beide
        // auf lokale Mitternacht normalisiert sind, sollte die Differenz die Anzahl der Kalendertage widerspiegeln.
        const timeDiffMs = effectiveCalcDayStartLocal.getTime() - anchorDayStartLocal.getTime();
        const dayOffsetFromAnchor = Math.round(timeDiffMs / msPerDay);


        // Interpretation des dayOffsetFromAnchor:
        // - 0: effectiveCalcDayStartLocal ist derselbe Kalendertag wie anchorDayStartLocal.
        //      (Bedeutet: Vormittag des Tages, an dessen Abend der START_HIJRI_DAY beginnt -> Vormonat)
        // - 1: effectiveCalcDayStartLocal ist ein Kalendertag nach anchorDayStartLocal.
        //      (Bedeutet: Abend des anchorDayStartLocal oder Vormittag des Folgetages -> START_HIJRI_DAY ist aktiv)

        // daysToAdd zum START_HIJRI_DAY:
        // Wenn dayOffsetFromAnchor = 1, dann ist es der START_HIJRI_DAY (also 0 Tage addieren).
        // Wenn dayOffsetFromAnchor = 0, dann ist es der Vormonat (also -1 Tage addieren zum START_HIJRI_DAY).
        let daysToAdd = dayOffsetFromAnchor - 1;

        let currentDay = MANUAL_SETTINGS.START_HIJRI_DAY + daysToAdd;
        let currentMonthIndex = hijriMonthOrder.indexOf(MANUAL_SETTINGS.START_HIJRI_MONTH_KEY);
        let currentYear = MANUAL_SETTINGS.START_HIJRI_YEAR;

        if (currentMonthIndex === -1) {
            console.error("Ungültiger START_HIJRI_MONTH_KEY in MANUAL_SETTINGS:", MANUAL_SETTINGS.START_HIJRI_MONTH_KEY);
            return null;
        }

        // Normalisierung, falls wir vor dem START_HIJRI_DAY sind (currentDay <= 0)
        while (currentDay <= 0) {
            currentMonthIndex--;
            if (currentMonthIndex < 0) {
                currentMonthIndex = hijriMonthOrder.length - 1;
                currentYear--;
            }
            currentDay += 30; // Addiere 30 Tage des (angenommenen) Vormonats
        }

        // Normalisierung für Monats-/Jahreswechsel vorwärts (Annahme: 30 Tage pro Monat)
        while (currentDay > 30) {
            currentDay -= 30;
            currentMonthIndex++;
            if (currentMonthIndex >= hijriMonthOrder.length) {
                currentMonthIndex = 0;
                currentYear++;
            }
        }

        const currentMonthKey = hijriMonthOrder[currentMonthIndex];
        const currentMonthNameDe = hijriMonthMap[currentMonthKey] || currentMonthKey;

        return {
            day: currentDay,
            month: { number: currentMonthIndex + 1, en: currentMonthKey },
            month_name: currentMonthNameDe,
            year: currentYear,
            source: 'manual_js_anchored_v3',
            status: 'confirmed',
        };

    } catch (e) {
        console.error("Fehler in calculateManualHijriDate:", e);
        return null;
    }
}


async function fetchExpectedHijriData() {
    const now = getCurrentTime();
    const maghribTimeStr = prayerTimesData['Maghrib'];
    let isAfterMaghribFlag = false;
    let dateForCalculation = now;

    if (maghribTimeStr) {
        const maghribTime = parsePrayerTime(maghribTimeStr, now);
        if (maghribTime && now >= maghribTime) {
            isAfterMaghribFlag = true;
            dateForCalculation = getTomorrowDate(now);
        }
    }

    if (currentHijriMode === 'manual') {
        return Promise.resolve(calculateManualHijriDate(dateForCalculation));
    } else {
        if (isAfterMaghribFlag) {
            return fetchApiIslamicDateForTomorrow(now);
        } else {
            return fetchApiCurrentIslamicDate();
        }
    }
}

export function checkAndUpdateIslamicDate() {
    if (!initialDataLoaded || isFetchingIslamicDate) return;
    console.log("Checking for Islamic date update..."); // Hinzugefügtes Logging
    isFetchingIslamicDate = true;
    fetchExpectedHijriData()
        .then(expectedHijriData => {
            if (expectedHijriData) {
                let needsUiUpdate = false;
                if (!displayedIslamicDateObject) {
                    needsUiUpdate = true;
                } else {
                    const expDay = expectedHijriData.day;
                    const expMonthKey = expectedHijriData.month?.en;
                    const expYear = expectedHijriData.year;
                    const currDay = displayedIslamicDateObject.day;
                    const currMonthKey = displayedIslamicDateObject.month?.en;
                    const currYear = displayedIslamicDateObject.year;
                    if (expDay !== currDay || expMonthKey !== currMonthKey || expYear !== currYear) {
                        needsUiUpdate = true;
                    }
                }
                if (needsUiUpdate) {
                    console.log("New Islamic date detected, updating UI.", expectedHijriData); // Hinzugefügtes Logging
                    updateIslamicDateUI(expectedHijriData);
                } else {
                    console.log("No Islamic date change detected."); // Hinzugefügtes Logging
                }
            }
        })
        .catch(error => {
            console.error("Fehler beim Holen/Berechnen des erwarteten islamischen Datums:", error.message);
            if (elements.islamicDate) elements.islamicDate.textContent = "Datumsfehler";
            setDisplayedIslamicDateObject(null);
        })
        .finally(() => { isFetchingIslamicDate = false; });
}

function checkGregorianDateChange() {
    if (!initialDataLoaded) return;
    const now = getCurrentTime();
    const currentDateStr = now.toDateString();
    if (lastCheckedGregorianDate && currentDateStr !== lastCheckedGregorianDate) {
        console.log('GREGORIANISCHER DATUMSWECHSEL ERKANNT - Lade neue Daten');
        updateDateDisplay(); // Datum im UI aktualisieren
        if (typeof reloadDataFromDebug === 'function') {
            reloadDataFromDebug();
        } else {
            loadInitialData();
        }
        scheduleMidnightUpdate();
    }
    lastCheckedGregorianDate = currentDateStr;
}

function scheduleMidnightUpdate() {
    if (midnightUpdateTimer) clearTimeout(midnightUpdateTimer);
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 1, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    midnightUpdateTimer = setTimeout(() => {
        console.log('MITTERNACHT ERREICHT - Lade neue Daten für neuen Tag');
        if (typeof reloadDataFromDebug === 'function') {
            reloadDataFromDebug();
        } else {
            loadInitialData();
        }
        scheduleMidnightUpdate();
    }, msUntilMidnight);
}

export function loadInitialData() {
    setInitialDataLoaded(false);
    setLastHighlightMinute(-1);
    isFetchingIslamicDate = false;
    displayError("Lade Gebetszeiten...");
    if (elements.islamicDate) elements.islamicDate.textContent = "Lade...";
    setDisplayedIslamicDateObject(null);
    currentHijriMode = HIJRI_MODE;

    fetchPrayerTimes(latitude, longitude, calculationMethod)
        .then((times) => {
            if (!times) throw new Error("Gebetszeiten konnten nicht abgerufen werden.");
            setPrayerTimesData(times);
            updatePrayerTimesUI(times);
            setJumaaTimeUI('12:30'); // Beispiel
            setIshaTimeUI('19:50'); // Beispiel
            return fetchExpectedHijriData();
        })
        .then(hijriData => {
            if (hijriData) {
                updateIslamicDateUI(hijriData);
            } else {
                console.warn("Islamisches Datum konnte initial nicht geladen werden.");
                if (elements.islamicDate) elements.islamicDate.textContent = "Fehler";
                setDisplayedIslamicDateObject(null);
            }
            setInitialDataLoaded(true);
            lastCheckedGregorianDate = getCurrentTime().toDateString();
            loadRetryCount = 0; // Reset retry count on success
            updateUI();
        })
        .catch((error) => {
            console.error('Fehler beim initialen Laden:', error.message);

            if (loadRetryCount < MAX_RETRIES) {
                loadRetryCount++;
                const delay = 2000; // 2 seconds delay
                console.log(`Verbindungsfehler. Versuch ${loadRetryCount} von ${MAX_RETRIES}. Neustart in ${delay}ms...`);
                displayError(`Verbindungsfehler. Neuer Versuch in ${delay / 1000}s...`);

                setTimeout(() => {
                    loadInitialData();
                }, delay);
            } else {
                console.error(`Max Retries (${MAX_RETRIES}) erreicht. Gebetszeiten konnten nicht geladen werden.`);
                displayError(error.message || 'Fehler beim Laden der Daten. Bitte Seite neu laden.');
                setInitialDataLoaded(false);
                setPrayerTimesData({});
                setDisplayedIslamicDateObject(null);
                if (elements.islamicDate) elements.islamicDate.textContent = "Fehler";
            }
        });
}

function updateLoop() {
    updateTimeDisplay();
    if (initialDataLoaded) {
        updateUI();
        // checkAndUpdateIslamicDate(); // REMOVED FROM HERE
        checkGregorianDateChange();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    currentHijriMode = HIJRI_MODE;
    if (typeof initializeDebugControls === 'function') {
        initializeDebugControls();
    }
    updateTimeDisplay();
    updateDateDisplay(); // Datum initial setzen
    loadInitialData();
    setInterval(updateLoop, 1000);
    scheduleMidnightUpdate();
});



