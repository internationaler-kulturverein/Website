// prayerLogic.js
import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig, // Wird für Eid-UI-Struktur und Shuruk-Anzeige in ui.js benötigt
    eidPrayerConfig,
} from './config.js';
import {
    parsePrayerTime,
    getAdhanEndTime,
    getIqamaEndTime,
} from './timeUtils.js';
import { initialDataLoaded, prayerTimesData } from './main.js';

/**
 * Erstellt eine Liste der Gebetskonfigurationen, die für die *Berechnung* des nächsten
 * und hervorzuhebenden Gebets relevant sind.
 * Eid wird nur am tatsächlichen Tag des Eid-Gebets in diese Logik-Liste aufgenommen.
 * Shuruk wird für diese Logik-Berechnungen komplett ignoriert.
 * @param {Date} now - Das aktuelle Datum und die aktuelle Uhrzeit.
 * @param {object} currentPrayerTimes - Die aktuell geladenen Gebetszeiten.
 * @returns {Array<object>} Eine Liste von effektiven Gebetskonfigurationsobjekten für die Logik.
 */
export function getEffectivePrayerConfigs(now, currentPrayerTimes) {
    if (!currentPrayerTimes) {
        console.warn("Logic: getEffectivePrayerConfigs - currentPrayerTimes nicht verfügbar");
        return [];
    }

    const effectiveConfigs = [];
    const isFriday = now.getDay() === 5;
    const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    console.log("Logic: getEffectivePrayerConfigs aufgerufen für Datum:", todayDateString);

    // Hauptgebete
    prayerTimesConfig.forEach((config) => {
        if (isFriday && config.name === 'Dhuhr' && currentPrayerTimes.Jumaa) {
            return; // Dhuhr wird durch Jumaa ersetzt
        }
        if (currentPrayerTimes[config.name]) {
            effectiveConfigs.push({
                ...config,
                time: currentPrayerTimes[config.name],
            });
        } else {
            console.warn(`Logic: Fehlende Zeit für ${config.name} in currentPrayerTimes`);
        }
    });

    // Jumaa
    if (isFriday && currentPrayerTimes.Jumaa) {
        effectiveConfigs.push({
            ...jumaaConfig,
            time: currentPrayerTimes.Jumaa,
        });
    }

    // Eid wird für die Logik nur berücksichtigt, wenn es der heutige Tag ist
    // UND showEidPrayer (als genereller Schalter) an ist.
    // Shuruk wird für die Logik hier komplett ignoriert.
    if (eidPrayerConfig.showEidPrayer && eidPrayerConfig.dayOfEid === todayDateString) {
        console.log("Logic: Eid ist HEUTE und showEidPrayer ist true. Eid wird für Berechnungen verwendet.");
        effectiveConfigs.push({
            ...sunriseConfig, // Basis für UI-Element-IDs, die Eid "ausleiht"
            name: eidPrayerConfig.name,
            displayName: eidPrayerConfig.displayName,
            time: eidPrayerConfig.timeOfEid,
            adhanDurationMinutes: eidPrayerConfig.adhanDurationMinutes,
            iqamaDurationMinutes: eidPrayerConfig.iqamaDurationMinutes,
            isEidActive: true, // Wichtiges Flag für die Logik
        });
    } else {
        // In allen anderen Fällen (nicht Eid-Tag oder showEidPrayer ist false für Eid)
        // wird Shuruk NICHT zu den `effectiveConfigs` für die Gebetslogik hinzugefügt.
        // Die Anzeige von Shuruk-Zeit und -Titel in der UI erfolgt separat in `updatePrayerTimesUI`.
        console.log("Logic: Entweder nicht Eid-Tag oder Eid nicht aktiv. Shuruk wird NICHT für Berechnungen verwendet.");
    }
    return effectiveConfigs; // Diese Liste enthält jetzt KEIN Shuruk mehr, nur potenziell Eid.
}

/**
 * Findet das Gebet, das aktuell hervorgehoben werden soll (inkl. Adhan- und Iqama-Zeit).
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des hervorzuhebenden Gebets.
 */
export function findPrayerToHighlight(now) {
    if (!initialDataLoaded || !prayerTimesData) return null;

    const prayersWithTimes = [];
    // getEffectivePrayerConfigs liefert jetzt KEIN Shuruk mehr.
    const allEffectiveConfigsForLogic = getEffectivePrayerConfigs(now, prayerTimesData);

    console.log("Logic (Highlight): Verwendete Konfigs für Logik:", JSON.parse(JSON.stringify(allEffectiveConfigsForLogic.map(c => ({name: c.name, time: c.time})))));

    const processPrayer = (config, prayerTimeStr, contextDate) => {
        const prayerDate = parsePrayerTime(prayerTimeStr, contextDate);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersWithTimes.push({
                ...config,
                date: prayerDate,
                adhanEndTime: adhanEndTime,
                iqamaEndTime: iqamaEndTimeValue,
            });
        } else {
            console.warn(`Logic (Highlight): Konnte Zeit nicht parsen für ${config.name}: ${prayerTimeStr}`);
        }
    };

    allEffectiveConfigsForLogic.forEach((effConfig) => {
        if (effConfig.time && effConfig.time !== '--:--') {
            processPrayer(effConfig, effConfig.time, now);
        }
    });

    prayersWithTimes.sort((a, b) => a.date - b.date);

    let prayerToHighlight = null;
    for (const prayer of prayersWithTimes) {
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            prayerToHighlight = {
                ...prayer,
                isAdhanTime: now >= prayer.date && now < prayer.adhanEndTime,
            };
            return prayerToHighlight;
        }
    }

    let nextUpcomingPrayer = null;
    for (const prayer of prayersWithTimes) {
        if (prayer.date > now) {
            nextUpcomingPrayer = prayer;
            break;
        }
    }

    if (nextUpcomingPrayer) {
        prayerToHighlight = { ...nextUpcomingPrayer, isAdhanTime: false };
    } else if (prayersWithTimes.length > 0) {
        // Alle Gebete (ohne Shuruk) für heute vorbei. Nimm Fajr von morgen.
        const fajrConfig = prayerTimesConfig.find(p => p.name === 'Fajr');
        if (fajrConfig && prayerTimesData[fajrConfig.name]) {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0,0,0,0);
            const fajrTimeTomorrow = prayerTimesData[fajrConfig.name];
            const fajrDateTomorrow = parsePrayerTime(fajrTimeTomorrow, tomorrow);

            if (fajrDateTomorrow) {
                const adhanEndTomorrow = getAdhanEndTime(fajrConfig, fajrDateTomorrow);
                const iqamaEndTomorrow = getIqamaEndTime(fajrConfig, adhanEndTomorrow);
                prayerToHighlight = {
                    ...fajrConfig,
                    date: fajrDateTomorrow,
                    adhanEndTime: adhanEndTomorrow,
                    iqamaEndTime: iqamaEndTomorrow,
                    isAdhanTime: false,
                    time: fajrTimeTomorrow,
                };
            }
        }
    }
    return prayerToHighlight;
}

/**
 * Findet das Gebet, dessen Name als "nächstes Gebet" angezeigt werden soll.
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des nächsten Gebets oder null.
 */
export function findNextPrayer(now) {
    if (!initialDataLoaded || !prayerTimesData) return null;

    const prayersToCheck = [];
    // getEffectivePrayerConfigs liefert jetzt KEIN Shuruk mehr.
    const allEffectiveConfigsForLogic = getEffectivePrayerConfigs(now, prayerTimesData);
    console.log("Logic (NextPrayer): Verwendete Konfigs für Logik:", JSON.parse(JSON.stringify(allEffectiveConfigsForLogic.map(c => ({name: c.name, time: c.time})))));


    const processPrayerForNext = (config, prayerTimeStr, contextDate) => {
        const prayerDate = parsePrayerTime(prayerTimeStr, contextDate);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersToCheck.push({
                ...config,
                date: prayerDate,
                adhanEndTime: adhanEndTime,
                iqamaEndTime: iqamaEndTimeValue,
            });
        }
    };

    allEffectiveConfigsForLogic.forEach((effConfig) => {
        if (effConfig.time && effConfig.time !== '--:--') {
            processPrayerForNext(effConfig, effConfig.time, now);
        }
    });

    prayersToCheck.sort((a, b) => a.date - b.date);

    for (const prayer of prayersToCheck) {
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            return { ...prayer };
        }
    }

    let chronologicallyNextPrayer = null;
    for (const prayer of prayersToCheck) {
        if (prayer.date && prayer.date > now) {
            chronologicallyNextPrayer = prayer;
            break;
        }
    }

    if (!chronologicallyNextPrayer && prayersToCheck.length > 0) {
        // Alle Gebete (ohne Shuruk) für heute vorbei. Nimm Fajr von morgen.
        const fajrConfig = prayerTimesConfig.find(p => p.name === 'Fajr');
        if (fajrConfig && prayerTimesData[fajrConfig.name]) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0,0,0,0);
            const fajrTimeTomorrow = prayerTimesData[fajrConfig.name];
            const fajrDateTomorrow = parsePrayerTime(fajrTimeTomorrow, tomorrow);
            if (fajrDateTomorrow) {
                chronologicallyNextPrayer = {
                    ...fajrConfig,
                    date: fajrDateTomorrow,
                    time: fajrTimeTomorrow,
                };
            }
        }
    }
    return chronologicallyNextPrayer;
}
