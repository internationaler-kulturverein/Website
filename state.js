// state.js
// Zentraler Zustandsspeicher - wird von allen Modulen importiert
// Dient der Auflösung von zirkulären Abhängigkeiten zwischen main.js, ui.js, debug.js etc.

// --- DOM Elements ---
// Werden von main.js via initializeElements() oder direkt befüllt und von ui.js/debug.js gelesen
export let elements = {
    hoursAndMin: null,
    seconds: null,
    currentDate: null,
    islamicDate: null,
    nextPrayer: null,
    nextPrayerIcon: null,
};

export let debugElements = {
    overrideTimeInput: null,
    overrideDateInput: null,
    setOverrideBtn: null,
    resetRealTimeBtn: null,
    currentTimeStatus: null,
};

export function setElements(els) {
    elements = { ...elements, ...els };
}

export function setDebugElements(els) {
    debugElements = { ...debugElements, ...els };
}

// --- Application State ---
export let prayerTimesData = {};
export let initialDataLoaded = false;
export let lastCheckedGregorianDate = null;
export let midnightUpdateTimer = null;
export let displayedIslamicDateObject = null;
export let lastHighlightUpdateMinute = -1;

// --- Setter Functions für Application State ---
export function setPrayerTimesData(data) { prayerTimesData = data; }
export function setInitialDataLoaded(value) { initialDataLoaded = value; }
export function setLastCheckedGregorianDate(value) { lastCheckedGregorianDate = value; }
export function setMidnightUpdateTimer(value) { midnightUpdateTimer = value; }
export function setDisplayedIslamicDateObject(data) { displayedIslamicDateObject = data; }
export function setLastHighlightMinute(value) { lastHighlightUpdateMinute = value; }

// --- Migrierte Variablen aus main.js ---
let loadRetryCount = 0;
export function getLoadRetryCount() { return loadRetryCount; }
export function setLoadRetryCount(val) { loadRetryCount = val; }
export function incrementLoadRetryCount() { loadRetryCount++; return loadRetryCount; }

let isFetchingIslamicDate = false;
export function getIsFetchingIslamicDate() { return isFetchingIslamicDate; }
export function setIsFetchingIslamicDate(val) { isFetchingIslamicDate = val; }

let currentHijriMode = null;
export function getCurrentHijriMode() { return currentHijriMode; }
export function setCurrentHijriMode(val) { currentHijriMode = val; }

let isHijriDateCheckedForToday = false;
export function getIsHijriDateCheckedForToday() { return isHijriDateCheckedForToday; }
export function setIsHijriDateCheckedForToday(val) { isHijriDateCheckedForToday = val; }

// --- Debug State ---
export let useOverrideTime = false;
export let overrideTime = null;
export let overrideTimeSetAt = null;
export let useOverrideDate = false;
export let overrideDate = null;

// --- Setter Functions für Debug State ---
export function setOverrideTimeState(use, time, setAt) {
    useOverrideTime = use;
    overrideTime = time;
    overrideTimeSetAt = setAt;
}

export function setOverrideDateState(use, date) {
    useOverrideDate = use;
    overrideDate = date;
}
