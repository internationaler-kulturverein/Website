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
import {
    updatePrayerTimesUI,
    displayError,
    updateIslamicDateUI,
    setJumaaTimeUI,
    setIshaTimeUI,
    updateUI,
    updateTimeDisplay,
    updateDateDisplay,
    registerDateCheckCallback,
} from './ui.js';
import { initializeDebugControls, loadDataAndRefreshUI as reloadDataFromDebug, registerReloadCallback } from './debug.js';

import {
    prayerTimesData,
    initialDataLoaded,
    lastCheckedGregorianDate,
    midnightUpdateTimer,
    displayedIslamicDateObject,
    elements,
    setPrayerTimesData,
    setInitialDataLoaded,
    setLastHighlightMinute,
    setDisplayedIslamicDateObject,
    setMidnightUpdateTimer,
    setLastCheckedGregorianDate,
    setElements,
    setDebugElements,
    getLoadRetryCount,
    setLoadRetryCount,
    incrementLoadRetryCount,
    getIsFetchingIslamicDate,
    setIsFetchingIslamicDate,
    getCurrentHijriMode,
    setCurrentHijriMode,
    getIsHijriDateCheckedForToday,
    setIsHijriDateCheckedForToday,
} from './state.js';

const MAX_RETRIES = 3;

// --- DOM Elemente cachen via Setter in state.js ---
function initializeLocalElements() {
    setElements({
        hoursAndMin: document.getElementById('hoursAndMin'),
        seconds: document.getElementById('seconds'),
        currentDate: document.getElementById('current-date'),
        islamicDate: document.getElementById('islamic-date'),
        nextPrayer: document.getElementById('nextPrayer'),
        nextPrayerIcon: document.getElementById('nextPrayerIcon'),
    });
    setDebugElements({
        overrideTimeInput: document.getElementById('override-time-input'),
        overrideDateInput: document.getElementById('override-date-input'),
        setOverrideBtn: document.getElementById('set-override-time-btn'),
        resetRealTimeBtn: document.getElementById('reset-real-time-btn'),
        currentTimeStatus: document.getElementById('current-time-status'),
    });
}

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
            currentDay += 30;
        }

        // Normalisierung für Monats-/Jahreswechsel vorwärts
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

    if (getCurrentHijriMode() === 'manual') {
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
    if (!initialDataLoaded || getIsFetchingIslamicDate()) return;
    if (getIsHijriDateCheckedForToday()) return;
    setIsFetchingIslamicDate(true);
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
                    updateIslamicDateUI(expectedHijriData);
                }
                // Flag nur nach Maghrib setzen, damit vor Maghrib weiter geprüft wird
                const maghribStr = prayerTimesData['Maghrib'];
                if (maghribStr) {
                    const now = getCurrentTime();
                    const maghribTime = parsePrayerTime(maghribStr, now);
                    if (maghribTime && now >= maghribTime) {
                        setIsHijriDateCheckedForToday(true);
                    }
                }
            }
        })
        .catch(error => {
            console.error("Fehler beim Holen/Berechnen des erwarteten islamischen Datums:", error.message);
            if (elements.islamicDate) elements.islamicDate.textContent = "Datumsfehler";
            setDisplayedIslamicDateObject(null);
        })
        .finally(() => { setIsFetchingIslamicDate(false); });
}

function checkGregorianDateChange() {
    if (!initialDataLoaded) return;
    const now = getCurrentTime();
    const currentDateStr = now.toDateString();
    if (lastCheckedGregorianDate && currentDateStr !== lastCheckedGregorianDate) {
        updateDateDisplay(); // Datum im UI aktualisieren
        if (typeof reloadDataFromDebug === 'function') {
            reloadDataFromDebug();
        } else {
            loadInitialData();
        }
        scheduleMidnightUpdate();
    }
    setLastCheckedGregorianDate(currentDateStr);
}

function scheduleMidnightUpdate() {
    if (midnightUpdateTimer) clearTimeout(midnightUpdateTimer);
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 1, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    setMidnightUpdateTimer(setTimeout(() => {
        setIsHijriDateCheckedForToday(false);
        if (typeof reloadDataFromDebug === 'function') {
            reloadDataFromDebug();
        } else {
            loadInitialData();
        }
        scheduleMidnightUpdate();
    }, msUntilMidnight));
}

export function loadInitialData() {
    setInitialDataLoaded(false);
    setLastHighlightMinute(-1);
    setIsFetchingIslamicDate(false);
    setIsHijriDateCheckedForToday(false);
    displayError("Lade Gebetszeiten...");
    if (elements.islamicDate) elements.islamicDate.textContent = "Lade...";
    setDisplayedIslamicDateObject(null);
    setCurrentHijriMode(HIJRI_MODE);

    // Nach Maghrib-Reload: Gebetszeiten für morgen laden (islamischer Tag beginnt bei Maghrib)
    let dateForApi = undefined;
    if (sessionStorage.getItem('loadTomorrowTimes') === 'true') {
        sessionStorage.removeItem('loadTomorrowTimes');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateForApi = tomorrow;
    }

    fetchPrayerTimes(latitude, longitude, calculationMethod, dateForApi)
        .then((times) => {
            if (!times) throw new Error("Gebetszeiten konnten nicht abgerufen werden.");
            setPrayerTimesData(times);
            updatePrayerTimesUI(times);
            setJumaaTimeUI('12:45'); // Jumaa-Zeit (Freitagsgebet) — Anleitung zum Ändern: siehe config.js
            setIshaTimeUI('19:50'); // Isha-Zeit (manuell überschrieben) — Anleitung zum Ändern: siehe config.js
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
            setLastCheckedGregorianDate(getCurrentTime().toDateString());
            setLoadRetryCount(0); // Reset retry count on success
            scheduleMaghribReload();
            updateUI();
        })
        .catch((error) => {
            console.error('Fehler beim initialen Laden:', error.message);

            if (getLoadRetryCount() < MAX_RETRIES) {
                incrementLoadRetryCount();
                const delay = 2000; // 2 seconds delay
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

// --- Automatischer Seiten-Reload nach Maghrib (für 24/7-Betrieb) ---
// Stellt sicher, dass die Seite täglich frische Daten bekommt und kein
// Speicher oder Timer-Drift sich ansammelt. Der Reload erfolgt 10 Minuten
// nach Maghrib-Zeit, damit das Gebet vollständig abgeschlossen ist.
// Das Hijri-Datum ändert sich bereits bei Maghrib (via checkAndUpdateIslamicDate).
// Nach dem Reload werden die Gebetszeiten für den NÄCHSTEN Tag geladen,
// da im Islam der neue Tag mit Maghrib beginnt.
function scheduleMaghribReload() {
    if (!prayerTimesData['Maghrib']) return;

    const now = getCurrentTime();
    const maghribTime = parsePrayerTime(prayerTimesData['Maghrib'], now);
    if (!maghribTime) return;

    const reloadTime = maghribTime.getTime() + 10 * 60 * 1000; // Maghrib + 10 Minuten
    const delay = reloadTime - now.getTime();

    if (delay > 0) {
        setTimeout(() => {
            sessionStorage.setItem('loadTomorrowTimes', 'true');
            location.reload();
        }, delay);
    }
}

function updateLoop() {
    updateTimeDisplay();
    if (initialDataLoaded) {
        updateUI();
        checkGregorianDateChange();
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && initialDataLoaded) {
        checkAndUpdateIslamicDate();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initializeLocalElements(); // Initialize elements in state.js
    setCurrentHijriMode(HIJRI_MODE);

    // Registriere den Callback für regelmäßige Datumsprüfung (löst zirkuläre Abhängigkeit auf)
    registerDateCheckCallback(checkAndUpdateIslamicDate);

    // Registriere den Reload-Callback für debug.js (löst zirkuläre Abhängigkeit auf)
    registerReloadCallback(() => loadInitialData());

    if (typeof initializeDebugControls === 'function') {
        initializeDebugControls();
    }
    updateTimeDisplay();
    updateDateDisplay(); // Datum initial setzen
    loadInitialData();
    setInterval(updateLoop, 1000);
    scheduleMidnightUpdate();
});
