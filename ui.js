// ui.js
// Verantwortlich für die Aktualisierung der Benutzeroberfläche (DOM-Manipulation).

import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig,
    eidPrayerConfig, // Importiere Eid-Konfiguration
    highlightClassNameMobile,
    highlightClassNameDesktop,
    hijriMonthMap,
} from './config.js';
import { getCurrentTime } from './timeUtils.js';
import {
    findPrayerToHighlight,
    findNextPrayer,
} from './prayerLogic.js';
import {
    elements,
    initialDataLoaded,
    prayerTimesData,
    lastHighlightUpdateMinute,
    setLastHighlightMinute,
    setPrayerTimesData,
    setDisplayedIslamicDateObject,
} from './state.js';
// Callback für regelmäßige Datumsprüfung
let onDateCheckCallback = null;

/**
 * Registriert den Callback für die regelmäßige Datumsprüfung.
 * Dies löst die zirkuläre Abhängigkeit zwischen main.js und ui.js auf.
 * @param {Function} callback - Die Funktion, die regelmäßig zur Datumsprüfung aufgerufen werden soll.
 */
export function registerDateCheckCallback(callback) {
    onDateCheckCallback = callback;
}

// --- Module-level state for UI ---
let prayerToHighlightState = null;
let nextPrayerForTextState = null;

/**
 * Aktualisiert die Anzeige der Gebetszeiten in der UI.
 * @param {object} currentPrayerTimes - Das Objekt mit den Gebetszeiten.
 */
export function updatePrayerTimesUI(currentPrayerTimes) {
    const timesToDisplay = currentPrayerTimes || prayerTimesData;
    if (!timesToDisplay) {
        console.warn('UI: updatePrayerTimesUI - timesToDisplay ist nicht verfügbar.');
        return;
    }

    let eidDateForFormatting = null;
    let eidDayMonthString = "";
    let eidWeekdayString = "";

    if (eidPrayerConfig.dayOfEid) {
        const parts = eidPrayerConfig.dayOfEid.split('-');
        if (parts.length === 3) {
            eidDateForFormatting = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1, // Monat ist 0-basiert
                parseInt(parts[2])
            );
            if (!isNaN(eidDateForFormatting.getTime())) {
                const day = String(eidDateForFormatting.getDate()).padStart(2, '0');
                const month = String(eidDateForFormatting.getMonth() + 1).padStart(2, '0');
                eidDayMonthString = `${day}.${month}`;

                const weekdaysShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                eidWeekdayString = weekdaysShort[eidDateForFormatting.getDay()] + '.';
            } else {
                eidDateForFormatting = null;
                console.warn("UI: Ungültiges Datum in eidPrayerConfig.dayOfEid:", eidPrayerConfig.dayOfEid);
            }
        } else {
            console.warn("UI: Falsches Format für eidPrayerConfig.dayOfEid (erwartet YYYY-MM-DD):", eidPrayerConfig.dayOfEid);
        }
    }

    const allDisplayConfigs = [...prayerTimesConfig, sunriseConfig];

    allDisplayConfigs.forEach((config) => {
        let timeValue;

        if (config.name === 'Sunrise') {
            const titleElMobile = document.getElementById(config.idTitleMobile);
            const titleElDesktop = document.getElementById(config.idTitleDesktopSide);

            if (eidPrayerConfig.showEidPrayer) {
                const eidMainTitleText = eidPrayerConfig.displayName;
                const eidDateDetailText = eidDateForFormatting ? `${eidWeekdayString} ${eidDayMonthString}` : "";

                function setEidTitle(element) {
                    const mainSpan = document.createElement('span');
                    mainSpan.className = 'eid-main-title';
                    mainSpan.textContent = eidMainTitleText;
                    if (eidDateDetailText) {
                        const br = document.createElement('br');
                        const dateSpan = document.createElement('span');
                        dateSpan.className = 'eid-date-detail';
                        dateSpan.textContent = eidDateDetailText;
                        element.replaceChildren(mainSpan, br, dateSpan);
                    } else {
                        element.replaceChildren(mainSpan);
                    }
                }

                timeValue = eidPrayerConfig.timeOfEid;

                if (titleElMobile) setEidTitle(titleElMobile);
                if (titleElDesktop) setEidTitle(titleElDesktop);

            } else {
                const shurukTitleText = sunriseConfig.displayName || sunriseConfig.name;
                if (titleElMobile) titleElMobile.textContent = shurukTitleText;
                if (titleElDesktop) titleElDesktop.textContent = shurukTitleText;

                timeValue = timesToDisplay[sunriseConfig.name]
                    ? timesToDisplay[sunriseConfig.name].substring(0, 5)
                    : '--:--';
            }
        } else {
            timeValue = timesToDisplay[config.name]
                ? timesToDisplay[config.name].substring(0, 5)
                : '--:--';
        }

        const timeElementMobile = document.getElementById(config.idTimeMobile);
        if (timeElementMobile) timeElementMobile.textContent = timeValue;

        if (config.idTimeDesktop) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktop);
            if (timeElementDesktop) timeElementDesktop.textContent = timeValue;
        }
        if (config.name === 'Sunrise' && config.idTimeDesktopSide) {
            const desktopSideEl = document.getElementById(config.idTimeDesktopSide);
            if (desktopSideEl) desktopSideEl.textContent = timeValue;
        }
    });

    const jumaaTimeString = timesToDisplay['Jumaa'];
    if (jumaaTimeString) {
        const jumaaTimeValue = jumaaTimeString.substring(0, 5);
        if (jumaaConfig.idTimeMobile) {
            const jumaaMobileEl = document.getElementById(jumaaConfig.idTimeMobile);
            if (jumaaMobileEl) jumaaMobileEl.textContent = jumaaTimeValue;
        }
        if (jumaaConfig.idTimeDesktopSide) {
            const jumaaDesktopSideEl = document.getElementById(jumaaConfig.idTimeDesktopSide);
            if (jumaaDesktopSideEl) jumaaDesktopSideEl.textContent = jumaaTimeValue;
        }
    } else {
        if (jumaaConfig.idTimeMobile) {
            const jumaaMobileEl = document.getElementById(jumaaConfig.idTimeMobile);
            if (jumaaMobileEl) jumaaMobileEl.textContent = '--:--';
        }
        if (jumaaConfig.idTimeDesktopSide) {
            const jumaaDesktopSideEl = document.getElementById(jumaaConfig.idTimeDesktopSide);
            if (jumaaDesktopSideEl) jumaaDesktopSideEl.textContent = '--:--';
        }
    }
}

export function displayError(message) {
    if (elements.nextPrayer) {
        elements.nextPrayer.textContent = message;
        elements.nextPrayer.style.color = 'orange';
    }
    if (elements.nextPrayerIcon) {
        elements.nextPrayerIcon.style.display = 'none';
    }
    if (elements.islamicDate) elements.islamicDate.textContent = 'Fehler';
}

export function highlightPrayer(prayerToHighlight) {
    if (!initialDataLoaded) return;

    const allPossibleHighlightableConfigs = [
        ...prayerTimesConfig,
        jumaaConfig,
        sunriseConfig,
    ];

    allPossibleHighlightableConfigs.forEach((config) => {
        if (config.idMobileRow) {
            const mobileRowElement = document.getElementById(config.idMobileRow);
            if (mobileRowElement) mobileRowElement.classList.remove(highlightClassNameMobile, 'blink-bg');
        }
        if (config.idMobileCol) {
            const mobileColElement = document.getElementById(config.idMobileCol);
            if (mobileColElement) mobileColElement.classList.remove(highlightClassNameMobile, 'blink-bg');
        }

        let desktopHighlightTarget = null;
        if (config.name === 'Jumaa' && config.idDesktopCard) {
            const jumaaCard = document.getElementById(config.idDesktopCard);
            if (jumaaCard) desktopHighlightTarget = jumaaCard.querySelector('.card-body > .d-flex');
        } else if (config.name === 'Sunrise' && config.idTimeDesktopSide) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktopSide);
            if (timeElementDesktop) {
                const shurukCard = timeElementDesktop.closest('#shurukDesktopCard');
                if (shurukCard) desktopHighlightTarget = shurukCard.querySelector('.d-flex.flex-column');
            }
        } else if (config.idTimeDesktop && !config.idDesktopCard) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktop);
            if (timeElementDesktop) desktopHighlightTarget = timeElementDesktop.closest('.d-flex.flex-column');
        }
        if (desktopHighlightTarget) desktopHighlightTarget.classList.remove(highlightClassNameDesktop, 'blink-bg');
    });

    if (prayerToHighlight) {
        const useBlinking = prayerToHighlight.isAdhanTime === true;
        const currentConfigForHighlight = prayerToHighlight;

        if (currentConfigForHighlight.idMobileRow) {
            const nextMobileRowElement = document.getElementById(currentConfigForHighlight.idMobileRow);
            if (nextMobileRowElement) {
                nextMobileRowElement.classList.add(highlightClassNameMobile);
                if (useBlinking) nextMobileRowElement.classList.add('blink-bg');
            }
        }
        if (currentConfigForHighlight.idMobileCol) {
            const nextMobileColElement = document.getElementById(currentConfigForHighlight.idMobileCol);
            if (nextMobileColElement) {
                nextMobileColElement.classList.add(highlightClassNameMobile);
                if (useBlinking) nextMobileColElement.classList.add('blink-bg');
            }
        }

        let nextDesktopHighlightTarget = null;
        if (currentConfigForHighlight.name === 'Jumaa' && currentConfigForHighlight.idDesktopCard) {
            const jumaaCard = document.getElementById(currentConfigForHighlight.idDesktopCard);
            if (jumaaCard) nextDesktopHighlightTarget = jumaaCard.querySelector('.card-body > .d-flex');
        } else if (currentConfigForHighlight.name === 'Eid' || (currentConfigForHighlight.name === 'Sunrise' && currentConfigForHighlight.idTimeDesktopSide)) {
            const timeElementDesktop = document.getElementById(currentConfigForHighlight.idTimeDesktopSide);
            if (timeElementDesktop) {
                const shurukCard = timeElementDesktop.closest('#shurukDesktopCard');
                if (shurukCard) nextDesktopHighlightTarget = shurukCard.querySelector('.d-flex.flex-column');
            }
        } else if (currentConfigForHighlight.idTimeDesktop && !currentConfigForHighlight.idDesktopCard) {
            const nextTimeElementDesktop = document.getElementById(currentConfigForHighlight.idTimeDesktop);
            if (nextTimeElementDesktop) nextDesktopHighlightTarget = nextTimeElementDesktop.closest('.d-flex.flex-column');
        }

        if (nextDesktopHighlightTarget) {
            nextDesktopHighlightTarget.classList.add(highlightClassNameDesktop);
            if (useBlinking) nextDesktopHighlightTarget.classList.add('blink-bg');
        }
    }
}

/**
 * Berechnet den Countdown-Text für ein bevorstehendes Gebet.
 * @param {Date} targetTime - Der Zeitpunkt des nächsten Gebets.
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {string|null} Der formatierte Countdown-String oder null wenn timeDiff <= 0.
 */
function calculateCountdown(targetTime, now) {
    const timeDiff = targetTime.getTime() - now.getTime();
    if (timeDiff <= 0) return null;

    let timeLeftString = '';
    const totalMinutesLeft = Math.floor(timeDiff / (1000 * 60));

    if (totalMinutesLeft < 1) {
        const secondsLeft = Math.ceil(timeDiff / 1000);
        timeLeftString = `${secondsLeft} Sek`;
    } else {
        const hoursLeft = Math.floor(totalMinutesLeft / 60);
        const minutesLeft = totalMinutesLeft % 60;
        if (hoursLeft > 0) timeLeftString += `${hoursLeft} Std `;
        timeLeftString += `${minutesLeft} Min`;
    }

    return timeLeftString;
}

export function updateNextPrayerTimerDisplay(prayerToHighlight, nextPrayerForText, now) {
    if (!elements.nextPrayer) return;
    const iconElement = elements.nextPrayerIcon;

    if (!initialDataLoaded) {
        elements.nextPrayer.textContent = 'Lade...';
        if (iconElement) iconElement.style.display = 'none';
        return;
    }

    let displayText = 'Warte...';
    let textColor = 'grey';
    let showIcon = false;
    let iconFill = 'currentColor';

    if (prayerToHighlight && prayerToHighlight.date) {
        if (now >= prayerToHighlight.date && now < prayerToHighlight.iqamaEndTime) {
            if (prayerToHighlight.isAdhanTime === true) {
                displayText = `Adhan`;
                textColor = '#90EE90';
                showIcon = true;
                iconFill = textColor;
            } else {
                displayText = `${prayerToHighlight.displayName || prayerToHighlight.name}`;
                textColor = 'white';
                showIcon = true;
            }
        }
        else if (nextPrayerForText && nextPrayerForText.date) {
            const timeLeftString = calculateCountdown(nextPrayerForText.date, now);
            if (timeLeftString) {
                const nextPrayerNameDisplay = (nextPrayerForText.displayName || nextPrayerForText.name)
                    .charAt(0).toUpperCase() + (nextPrayerForText.displayName || nextPrayerForText.name).slice(1);
                displayText = `${nextPrayerNameDisplay} in ${timeLeftString}`;
                textColor = 'white';
                showIcon = true;
            } else {
                displayText = "Zeiten aktualisieren...";
            }
        }
    } else if (nextPrayerForText && nextPrayerForText.date) {
        const timeLeftString = calculateCountdown(nextPrayerForText.date, now);
        if (timeLeftString) {
            const nextPrayerNameDisplay = (nextPrayerForText.displayName || nextPrayerForText.name)
                .charAt(0).toUpperCase() + (nextPrayerForText.displayName || nextPrayerForText.name).slice(1);
            displayText = `${nextPrayerNameDisplay} in ${timeLeftString}`;
            textColor = 'white';
            showIcon = true;
        }
    }

    elements.nextPrayer.textContent = displayText;
    elements.nextPrayer.style.color = textColor;
    if (iconElement) {
        iconElement.style.display = showIcon ? '' : 'none';
        iconElement.style.fill = iconFill;
    }
}

export function updateTimeDisplay() {
    const now = getCurrentTime();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const secondsValue = now.getSeconds().toString().padStart(2, '0');

    if (elements.hoursAndMin) elements.hoursAndMin.textContent = `${hours}:${minutes}`;
    if (elements.seconds) elements.seconds.textContent = `:${secondsValue}`;
}

export function updateDateDisplay() {
    const now = getCurrentTime();
    if (elements.currentDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.currentDate.textContent = now.toLocaleDateString('de-DE', options);
    }
}

export function updateIslamicDateUI(hijriData) {
    const islamicDateElement = elements.islamicDate;

    if (!hijriData || typeof hijriData.day === 'undefined') {
        if (islamicDateElement) islamicDateElement.textContent = "Datum nicht verfügbar";
        setDisplayedIslamicDateObject(null);
        return;
    }

    const day = hijriData.day;
    const year = hijriData.year;
    let monthNameDe;

    if (hijriData.month_name && (hijriData.source === 'manual_js_anchored' || hijriData.source === 'manual_direct' || hijriData.source === 'manual_js_anchored_v3')) {
        monthNameDe = hijriData.month_name;
    } else if (hijriData.month && hijriData.month.en) {
        const monthEn = hijriData.month.en;
        monthNameDe = hijriMonthMap[monthEn] || monthEn;
    } else if (hijriData.month_name) {
        monthNameDe = hijriData.month_name;
    } else {
        monthNameDe = "Unbek. Monat";
    }

    const dateString = `${day}. ${monthNameDe} ${year} H.`;

    if (islamicDateElement) {
        islamicDateElement.textContent = dateString;
    }
    setDisplayedIslamicDateObject(hijriData);
}

export function setIshaTimeUI(timeStr) {
    const cleanTime = timeStr.substring(0, 5);
    const currentTimes = { ...prayerTimesData, Isha: cleanTime };
    setPrayerTimesData(currentTimes);
    updatePrayerTimesUI(currentTimes);

    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

export function setJumaaTimeUI(timeStr) {
    const cleanTime = timeStr.substring(0, 5);
    const currentTimes = { ...prayerTimesData, Jumaa: cleanTime };
    setPrayerTimesData(currentTimes);
    updatePrayerTimesUI(currentTimes);

    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

export function updateUI() {
    const now = getCurrentTime();
    const currentMinute = now.getMinutes();

    // --- OPTIMIERUNG: Aufwändige Berechnungen nur einmal pro Minute ausführen ---
    if (currentMinute !== lastHighlightUpdateMinute || lastHighlightUpdateMinute === -1) {
        // 1. Gebetslogik ausführen und Ergebnisse zwischenspeichern
        prayerToHighlightState = findPrayerToHighlight(now);
        nextPrayerForTextState = findNextPrayer(now);

        // 2. Visuelles Highlight aktualisieren (nur einmal pro Minute nötig)
        highlightPrayer(prayerToHighlightState);
        setLastHighlightMinute(currentMinute);

        // 3. Islamisches Datum prüfen (jede Minute, nicht nur bei Maghrib-Übergang)
        if (onDateCheckCallback) {
            onDateCheckCallback();
        }
    }

    // --- Sekundliche Aktualisierung des Countdowns ---
    // Verwendet die zwischengespeicherten Ergebnisse für maximale Effizienz
    updateNextPrayerTimerDisplay(prayerToHighlightState, nextPrayerForTextState, now);
}
