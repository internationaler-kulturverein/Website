// ui.js
// Verantwortlich für die Aktualisierung der Benutzeroberfläche (DOM-Manipulation).

import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig,
    highlightClassNameMobile,
    highlightClassNameDesktop,
    hijriMonthMap,
} from './config.js';
import { getCurrentTime } from './timeUtils.js';
import { findPrayerToHighlight, findNextPrayer } from './prayerLogic.js';
import {
    elements,
    initialDataLoaded,
    prayerTimesData,
    lastHighlightUpdateMinute,
    setLastHighlightMinute,
    setPrayerTimesData,
    setDisplayedIslamicDateObject,
} from './main.js';

/**
 * Aktualisiert die Anzeige der Gebetszeiten in der UI.
 * @param {object} currentPrayerTimes - Das Objekt mit den Gebetszeiten.
 */
export function updatePrayerTimesUI(currentPrayerTimes) {
    const timesToDisplay = currentPrayerTimes || prayerTimesData;
    const allDisplayConfigs = [...prayerTimesConfig, sunriseConfig];

    allDisplayConfigs.forEach((config) => {
        let timeValue = timesToDisplay[config.name]
            ? timesToDisplay[config.name].substring(0, 5)
            : '--:--';

        const timeElementMobile = document.getElementById(config.idTimeMobile);
        if (timeElementMobile) timeElementMobile.textContent = timeValue;

        if (config.idTimeDesktop) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktop);
            if (timeElementDesktop) timeElementDesktop.textContent = timeValue;
        }
        if (config.name === 'Sunrise' && config.idTimeDesktopSide) {
            const sunriseDesktopSideEl = document.getElementById(config.idTimeDesktopSide);
            if (sunriseDesktopSideEl) sunriseDesktopSideEl.textContent = timeValue;
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

/**
 * Zeigt eine Fehlermeldung in der UI an.
 * @param {string} message - Die anzuzeigende Fehlermeldung.
 */
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

/**
 * Aktualisiert die Hervorhebung der aktuellen Gebetszeit in der UI.
 * @param {object|null} prayerToHighlight - Das hervorzuhebende Gebet oder null.
 */
export function highlightPrayer(prayerToHighlight) {
    if (!initialDataLoaded) return;
    const allHighlightableConfigs = [...prayerTimesConfig, jumaaConfig];

    allHighlightableConfigs.forEach((config) => {
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
        } else if (config.idTimeDesktop && !config.idDesktopCard) {
            const timeElementDesktop = document.getElementById(config.idTimeDesktop);
            if (timeElementDesktop) desktopHighlightTarget = timeElementDesktop.closest('.d-flex.flex-column');
        }
        if (desktopHighlightTarget) desktopHighlightTarget.classList.remove(highlightClassNameDesktop, 'blink-bg');
    });

    if (prayerToHighlight) {
        const useBlinking = prayerToHighlight.isAdhanTime === true;
        const currentPrayerConfig = allHighlightableConfigs.find(c => c.name === prayerToHighlight.name);
        if (currentPrayerConfig) {
            if (currentPrayerConfig.idMobileRow) {
                const nextMobileRowElement = document.getElementById(currentPrayerConfig.idMobileRow);
                if (nextMobileRowElement) {
                    nextMobileRowElement.classList.add(highlightClassNameMobile);
                    if (useBlinking) nextMobileRowElement.classList.add('blink-bg');
                }
            }
            if (currentPrayerConfig.idMobileCol) {
                const nextMobileColElement = document.getElementById(currentPrayerConfig.idMobileCol);
                if (nextMobileColElement) {
                    nextMobileColElement.classList.add(highlightClassNameMobile);
                    if (useBlinking) nextMobileColElement.classList.add('blink-bg');
                }
            }
            let nextDesktopHighlightTarget = null;
            if (currentPrayerConfig.name === 'Jumaa' && currentPrayerConfig.idDesktopCard) {
                const jumaaCard = document.getElementById(currentPrayerConfig.idDesktopCard);
                if (jumaaCard) nextDesktopHighlightTarget = jumaaCard.querySelector('.card-body > .d-flex');
            } else if (currentPrayerConfig.idTimeDesktop && !currentPrayerConfig.idDesktopCard) {
                const nextTimeElementDesktop = document.getElementById(currentPrayerConfig.idTimeDesktop);
                if (nextTimeElementDesktop) nextDesktopHighlightTarget = nextTimeElementDesktop.closest('.d-flex.flex-column');
            }
            if (nextDesktopHighlightTarget) {
                nextDesktopHighlightTarget.classList.add(highlightClassNameDesktop);
                if (useBlinking) nextDesktopHighlightTarget.classList.add('blink-bg');
            }
        }
    }
}

/**
 * Aktualisiert die Anzeige des Countdowns/Status zur nächsten Gebetszeit.
 * @param {object|null} prayerToHighlight
 * @param {object|null} nextPrayerForText
 * @param {Date} now
 */
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

    if (prayerToHighlight) {
        if (prayerToHighlight.isAdhanTime === true) {
            displayText = `Adhan`;
            textColor = '#90EE90';
            showIcon = true;
            iconFill = textColor;
        } else if (prayerToHighlight.adhanEndTime && prayerToHighlight.iqamaEndTime && now >= prayerToHighlight.adhanEndTime && now < prayerToHighlight.iqamaEndTime) {
            displayText = `${prayerToHighlight.displayName || prayerToHighlight.name}`;
            textColor = 'white';
            showIcon = true;
        } else if (nextPrayerForText && nextPrayerForText.date) {
            const timeDiff = nextPrayerForText.date.getTime() - now.getTime();
            if (timeDiff > 0) {
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
                const nextPrayerNameDisplay = (nextPrayerForText.displayName || nextPrayerForText.name).charAt(0).toUpperCase() + (nextPrayerForText.displayName || nextPrayerForText.name).slice(1);
                displayText = `${nextPrayerNameDisplay} in ${timeLeftString}`;
                textColor = 'white';
                showIcon = true;
            }
        }
    } else if (nextPrayerForText && nextPrayerForText.date) {
        const timeDiff = nextPrayerForText.date.getTime() - now.getTime();
        if (timeDiff > 0) {
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
            const nextPrayerNameDisplay = (nextPrayerForText.displayName || nextPrayerForText.name).charAt(0).toUpperCase() + (nextPrayerForText.displayName || nextPrayerForText.name).slice(1);
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

/**
 * Aktualisiert die Anzeige der Uhrzeit und des gregorianischen Datums.
 */
export function updateDateTimeDisplay() {
    const now = getCurrentTime();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const secondsValue = now.getSeconds().toString().padStart(2, '0');

    if (elements.hoursAndMin) elements.hoursAndMin.textContent = `${hours}:${minutes}`;
    if (elements.seconds) elements.seconds.textContent = `:${secondsValue}`;
    if (elements.currentDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.currentDate.textContent = now.toLocaleDateString('de-DE', options);
    }
}

/**
 * Aktualisiert die Anzeige des islamischen Datums.
 * @param {object|null} hijriData - Die abgerufenen Hijri-Daten oder null.
 */
export function updateIslamicDateUI(hijriData) {
    const islamicDateElement = elements.islamicDate;

    if (!hijriData || typeof hijriData.day === 'undefined') {
        if (islamicDateElement) islamicDateElement.textContent = "Datum nicht verfügbar";
        setDisplayedIslamicDateObject(null); // Wichtig: Globalen Zustand aktualisieren
        return;
    }

    const day = hijriData.day;
    const year = hijriData.year;
    let monthNameDe;

    // Monatsnamen ermitteln basierend auf der Struktur von hijriData
    if (hijriData.month_name && (hijriData.source === 'manual_js_anchored' || hijriData.source === 'manual_direct')) {
        // Manuelle JS-Funktion liefert month_name direkt deutsch
        monthNameDe = hijriData.month_name;
    } else if (hijriData.month && hijriData.month.en) { // API-Quelle (Aladhan)
        const monthEn = hijriData.month.en;
        monthNameDe = hijriMonthMap[monthEn] || monthEn; // Übersetzen oder Fallback
    } else if (hijriData.month_name) {
        // Allgemeiner Fallback, falls month_name vorhanden ist (z.B. von älterer manueller Logik)
        monthNameDe = hijriData.month_name;
    } else {
        monthNameDe = "Unbek. Monat";
    }

    const dateString = `${day}. ${monthNameDe} ${year} H.`;

    // Der "(Wartet)" Zusatz wird in dieser vereinfachten clientseitigen Logik nicht mehr verwendet.
    // if (hijriData.status === 'awaiting_confirmation') {
    //     dateString += ' (Wartet)';
    // }

    if (islamicDateElement) {
        islamicDateElement.textContent = dateString;
    }
    setDisplayedIslamicDateObject(hijriData); // Globalen Zustand mit dem vollen Objekt aktualisieren
}

/**
 * Setzt die Isha-Zeit manuell und aktualisiert die UI.
 * @param {string} timeStr - Die neue Isha-Zeit (HH:MM).
 */
export function setIshaTimeUI(timeStr) { // Diese Funktion wird von deiner main.js nicht mehr exportiert, aber falls du sie brauchst
    const cleanTime = timeStr.substring(0, 5);
    const currentTimes = { ...prayerTimesData, Isha: cleanTime };
    setPrayerTimesData(currentTimes);

    const ishaMobile = document.getElementById('Isha');
    if (ishaMobile) ishaMobile.textContent = cleanTime;
    const ishaWide = document.getElementById('Isha_wide');
    if (ishaWide) ishaWide.textContent = cleanTime;
    // console.log('Isha manuell gesetzt auf:', cleanTime);

    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

/**
 * Setzt die Jumaa-Zeit manuell und aktualisiert die UI.
 * @param {string} timeStr - Die neue Jumaa-Zeit (HH:MM).
 */
export function setJumaaTimeUI(timeStr) {
    const cleanTime = timeStr.substring(0, 5);
    const currentTimes = { ...prayerTimesData, Jumaa: cleanTime };
    setPrayerTimesData(currentTimes);

    if (jumaaConfig.idTimeMobile) {
        const jumaaMobile = document.getElementById(jumaaConfig.idTimeMobile);
        if (jumaaMobile) jumaaMobile.textContent = cleanTime;
    }
    if (jumaaConfig.idTimeDesktopSide) {
        const jumaaDesktopSide = document.getElementById(jumaaConfig.idTimeDesktopSide);
        if (jumaaDesktopSide) jumaaDesktopSide.textContent = cleanTime;
    }
    // console.log('Jumaa manuell gesetzt auf:', cleanTime);

    if (initialDataLoaded) {
        const now = getCurrentTime();
        const prayerToHighlight = findPrayerToHighlight(now);
        const chronologicallyNextPrayer = findNextPrayer(now);
        highlightPrayer(prayerToHighlight);
        updateNextPrayerTimerDisplay(prayerToHighlight, chronologicallyNextPrayer, now);
    }
}

/**
 * Aktualisiert Highlight und Countdown (wird nur aufgerufen, wenn initialDataLoaded true ist).
 */
export function updateUI() {
    const now = getCurrentTime();
    const prayerToHighlight = findPrayerToHighlight(now);
    const nextPrayerForText = findNextPrayer(now);
    const currentMinute = now.getMinutes();

    if (currentMinute !== lastHighlightUpdateMinute || lastHighlightUpdateMinute === -1) {
        highlightPrayer(prayerToHighlight);
        setLastHighlightMinute(currentMinute);
    }
    updateNextPrayerTimerDisplay(prayerToHighlight, nextPrayerForText, now);
}
