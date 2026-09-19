const button =
    document.getElementById("mic-button");

const status =
    document.getElementById("status");

const noteElement =
    document.getElementById("note");

const frequencyElement =
    document.getElementById("frequency");

const tuningStatus =
    document.getElementById("tuning-status");

const marker =
    document.getElementById("marker");

const selectedNoteElement =
    document.getElementById("selected-note");


// Наши шесть струн
const notes = {

    E2: {
        name: "E",
        fullName: "E2",
        freq: 82.41
    },

    A2: {
        name: "A",
        fullName: "A2",
        freq: 110.00
    },

    D3: {
        name: "D",
        fullName: "D3",
        freq: 146.83
    },

    G3: {
        name: "G",
        fullName: "G3",
        freq: 196.00
    },

    B3: {
        name: "B",
        fullName: "B3",
        freq: 246.94
    },

    E4: {
        name: "E",
        fullName: "E4",
        freq: 329.63
    }

};


// Выбранная струна
let selectedNote = null;


// История измерений
let frequencyHistory = [];


// Сколько хороших измерений подряд
let stableCount = 0;


// Кнопки выбора струн
const stringButtons =
    document.querySelectorAll(
        ".string-button"
    );


// ----------------------------------
// ВЫБОР СТРУНЫ
// ----------------------------------

stringButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            // Убираем выделение
            // со всех кнопок
            stringButtons.forEach(
                item => {

                    item.classList.remove(
                        "active"
                    );

                }
            );


            // Выделяем выбранную
            button.classList.add(
                "active"
            );


            // Получаем нужную струну
            selectedNote =
                notes[
                    button.dataset.note
                ];


            // Очищаем старые измерения
            frequencyHistory = [];


            stableCount = 0;


            // Возвращаем точку в центр
            marker.style.left = "50%";

            marker.style.background =
                "white";


            // Показываем выбранную ноту
            selectedNoteElement.textContent =
                selectedNote.fullName;


            noteElement.textContent =
                selectedNote.name;


            frequencyElement.textContent =
                "— Hz";


            tuningStatus.textContent =
                "Готов к настройке";

        }
    );

});


// ----------------------------------
// МИКРОФОН
// ----------------------------------

button.addEventListener(
    "click",
    async () => {

        if (!selectedNote) {

            status.textContent =
                "⚠️ Сначала выбери струну";

            return;

        }


        try {

            const stream =
                await navigator.mediaDevices
                    .getUserMedia({
                        audio: true
                    });


            status.textContent =
                "🎤 Микрофон работает";


            const audioContext =
                new AudioContext();


            if (
                audioContext.state ===
                "suspended"
            ) {

                await audioContext.resume();

            }


            const microphone =
                audioContext
                    .createMediaStreamSource(
                        stream
                    );


            const analyser =
                audioContext
                    .createAnalyser();


            // 4096 даёт достаточно длинное
            // окно для низких струн
            analyser.fftSize = 4096;


            microphone.connect(
                analyser
            );


            const data =
                new Float32Array(
                    analyser.fftSize
                );


            function detectFrequency() {

                analyser.getFloatTimeDomainData(
                    data
                );


                const result =
                    detectPitchYIN(
                        data,
                        audioContext.sampleRate,
                        selectedNote.freq
                    );


                if (result !== null) {

                    processFrequency(
                        result
                    );

                }


                requestAnimationFrame(
                    detectFrequency
                );

            }


            detectFrequency();


        } catch (error) {

            status.textContent =
                "❌ Не удалось получить микрофон";

            console.log(error);

        }

    }
);


// ----------------------------------
// ОБРАБОТКА ЧАСТОТЫ
// ----------------------------------

function processFrequency(frequency) {

    if (!selectedNote) {
        return;
    }


    /*
     * Дополнительная защита.
     *
     * Если алгоритм внезапно выдал
     * какую-нибудь полную ерунду,
     * не используем её.
     */

    const ratio =
        frequency /
        selectedNote.freq;


    if (
        ratio < 0.70 ||
        ratio > 1.30
    ) {

        return;

    }


    /*
     * Добавляем измерение
     */
    frequencyHistory.push(
        frequency
    );


    /*
     * Оставляем последние 6
     */
    if (
        frequencyHistory.length > 6
    ) {

        frequencyHistory.shift();

    }


    if (
        frequencyHistory.length < 3
    ) {

        return;

    }


    /*
     * Сортируем копию.
     *
     * Медиана гораздо лучше защищает
     * от случайного выброса.
     */

    const sorted =
        [...frequencyHistory]
            .sort(
                (a, b) => a - b
            );


    const middle =
        Math.floor(
            sorted.length / 2
        );


    let smoothFrequency;


    if (
        sorted.length % 2 === 0
    ) {

        smoothFrequency =
            (
                sorted[middle - 1] +
                sorted[middle]
            ) / 2;

    } else {

        smoothFrequency =
            sorted[middle];

    }


    /*
     * Считаем отклонение
     * от ИМЕННО выбранной струны.
     */

    const cents =
        1200 *
        Math.log2(
            smoothFrequency /
            selectedNote.freq
        );


    /*
     * Показываем частоту
     */

    noteElement.textContent =
        selectedNote.name;


    frequencyElement.textContent =
        smoothFrequency.toFixed(1)
        + " Hz";


    /*
     * Положение точки
     *
     * -50 cents = край слева
     *   0 cents = центр
     * +50 cents = край справа
     */

    let position =
        50 + cents;


    position =
        Math.max(
            5,
            Math.min(
                95,
                position
            )
        );


    marker.style.left =
        position + "%";


    /*
     * Зона точной настройки
     */

    if (
        Math.abs(cents) <= 5
    ) {

        stableCount++;


        if (
            stableCount >= 3
        ) {

            tuningStatus.textContent =
                "🟢 НАСТРОЕНО";

            marker.style.background =
                "#00ff66";

        }

    }

    else {

        stableCount = 0;


        /*
         * Ниже нужной частоты:
         * НАТЯНУТЬ струну
         */

        if (cents < 0) {

            tuningStatus.textContent =
                "🔵 НАТЯНИ СТРУНУ";

            marker.style.background =
                "#3399ff";

        }

        /*
         * Выше нужной частоты:
         * ОСЛАБИТЬ струну
         */

        else {

            tuningStatus.textContent =
                "🔴 ОСЛАБЬ СТРУНУ";

            marker.style.background =
                "#ff4444";

        }

    }

}


// ----------------------------------
// YIN
// ----------------------------------

function detectPitchYIN(
    buffer,
    sampleRate,
    targetFrequency
) {

    /*
     * Проверяем громкость
     */

    let rms = 0;


    for (
        let i = 0;
        i < buffer.length;
        i++
    ) {

        rms +=
            buffer[i] *
            buffer[i];

    }


    rms =
        Math.sqrt(
            rms /
            buffer.length
        );


    /*
     * Слишком тихий сигнал
     */

    if (
        rms < 0.015
    ) {

        return null;

    }


    /*
     * Ищем период только в диапазоне,
     * который имеет смысл для выбранной
     * струны.
     *
     * Это очень важно.
     *
     * Например B3 ≈ 247 Hz:
     *
     * мы не разрешаем алгоритму
     * свободно прыгать к A2 или G3.
     */

    const minFrequency =
        targetFrequency * 0.75;

    const maxFrequency =
        targetFrequency * 1.25;


    const minTau =
        Math.floor(
            sampleRate /
            maxFrequency
        );


    const maxTau =
        Math.ceil(
            sampleRate /
            minFrequency
        );


    const tauMax =
        Math.min(
            maxTau,
            Math.floor(
                buffer.length / 2
            )
        );


    /*
     * Разностная функция YIN
     */

    const difference =
        new Float32Array(
            tauMax + 1
        );


    for (
        let tau = 1;
        tau <= tauMax;
        tau++
    ) {

        let sum = 0;


        for (
            let i = 0;
            i < buffer.length - tau;
            i++
        ) {

            const delta =
                buffer[i] -
                buffer[i + tau];


            sum +=
                delta * delta;

        }


        difference[tau] =
            sum;

    }


    /*
     * Cumulative Mean Normalized Difference
     */

    const cmnd =
        new Float32Array(
            tauMax + 1
        );


    cmnd[0] = 1;


    let runningSum = 0;


    for (
        let tau = 1;
        tau <= tauMax;
        tau++
    ) {

        runningSum +=
            difference[tau];


        if (
            runningSum === 0
        ) {

            cmnd[tau] = 1;

        } else {

            cmnd[tau] =
                (
                    difference[tau] *
                    tau
                ) /
                runningSum;

        }

    }


    /*
     * Ищем первый хороший минимум
     */

    const threshold =
        0.15;


    let bestTau = -1;


    for (
        let tau = minTau;
        tau <= tauMax;
        tau++
    ) {

        if (
            cmnd[tau] <
            threshold
        ) {

            /*
             * Идём немного дальше,
             * пока значение улучшается.
             */

            while (
                tau + 1 <= tauMax &&
                cmnd[tau + 1] <
                cmnd[tau]
            ) {

                tau++;

            }


            bestTau =
                tau;

            break;

        }

    }


    /*
     * Если порог не найден,
     * ищем абсолютный минимум.
     */

    if (
        bestTau === -1
    ) {

        let minValue =
            Infinity;


        for (
            let tau = minTau;
            tau <= tauMax;
            tau++
        ) {

            if (
                cmnd[tau] <
                minValue
            ) {

                minValue =
                    cmnd[tau];

                bestTau =
                    tau;

            }

        }

    }


    if (
        bestTau <= 0 ||
        bestTau >= tauMax
    ) {

        return null;

    }


    /*
     * Небольшая интерполяция.
     *
     * Она делает частоту
     * немного точнее.
     */

    const s0 =
        cmnd[bestTau - 1];

    const s1 =
        cmnd[bestTau];

    const s2 =
        cmnd[bestTau + 1];


    const denominator =
        s0 -
        2 * s1 +
        s2;


    let refinedTau =
        bestTau;


    if (
        denominator !== 0
    ) {

        const shift =
            (
                s0 - s2
            ) /
            (
                2 * denominator
            );


        refinedTau +=
            Math.max(
                -1,
                Math.min(
                    1,
                    shift
                )
            );

    }


    const frequency =
        sampleRate /
        refinedTau;


    /*
     * Финальная проверка.
     */

    if (
        frequency <
        minFrequency ||
        frequency >
        maxFrequency
    ) {

        return null;

    }


    return frequency;
}