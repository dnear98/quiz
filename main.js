let allQuestions = [];
let testQuestions = [];
let currentIndex = 0;
let score = 0;

// JSON betöltése
fetch("adatok.json")
    .then(res => res.json())
    .then(data => {
        allQuestions = data;
        startNewTest();
    })
    .catch(err => {
        document.getElementById("quiz").innerHTML = "Hiba történt a kérdések betöltésekor.";
        console.error(err);
    });

function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Új teszt indítása
function startNewTest() {
    score = 0;
    currentIndex = 0;

    testQuestions = shuffle([...allQuestions]).slice(0, 20);

    renderSingleQuestion();
}

// Random sorrend
function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// Egy kérdés megjelenítése
function renderSingleQuestion() {
    const q = testQuestions[currentIndex];
    const div = document.getElementById("quiz");
    div.innerHTML = "";

    const box = document.createElement("div");
    box.className = "question";

    // kérdésszámláló
    box.innerHTML = `<div class="counter">${currentIndex + 1} / 20. kérdés</div>`;


    const questionText = document.createElement("div");
    questionText.className = "question-text";

    if (q.render_html === true) {
        questionText.innerHTML = q.kerdes;

    } else if (q.render_as_code === true) {
        questionText.innerHTML = `<pre><code>${escapeHTML(q.kerdes)}</code></pre>`;

    } else {
        questionText.innerHTML = `<h3>${escapeHTML(q.kerdes)}</h3>`;
    }

    box.appendChild(questionText);



    if (q.tipus === "valasztos") renderSingleChoice(box, q);
    if (q.tipus === "tobbvalasztos") renderMultiChoice(box, q);
    if (q.tipus === "igaz_hamis") renderSingleChoice(box, q);
    if (q.tipus === "parositas") renderPairing(box, q);
    if (q.tipus === "sorrend") renderOrdering(box, q);
    if (q.tipus === "csoportositas") renderGrouping(box, q);

    box.innerHTML += `<button onclick="checkCurrentAnswer()">Válasz ellenőrzése</button>`;
    div.appendChild(box);
}

// Válasz ellenőrzése + visszajelzés + helyes válasz kiírása
function checkCurrentAnswer() {
    const q = testQuestions[currentIndex];
    let correct = false;

    if (q.tipus === "valasztos") correct = checkSingleChoice(q);
    if (q.tipus === "tobbvalasztos") correct = checkMultiChoice(q);
    if (q.tipus === "igaz_hamis") correct = checkSingleChoice(q);
    if (q.tipus === "parositas") correct = checkPairing(q);
    if (q.tipus === "sorrend") correct = checkOrdering(q);
    if (q.tipus === "csoportositas") correct = checkGrouping(q);

    const div = document.getElementById("quiz");

    if (correct) {
        score++;
        div.innerHTML += `<p style="color:green; font-weight:bold;">Helyes válasz!</p>`;
    } else {
        div.innerHTML += `<p style="color:red; font-weight:bold;">Hibás válasz!</p>`;
        div.innerHTML += `<p><strong>Helyes megoldás:</strong><br>${getCorrectAnswerText(q)}</p>`;
    }

    div.innerHTML += `<button onclick="nextQuestion()">Tovább</button>`;
}

function nextQuestion() {
    currentIndex++;

    if (currentIndex >= 20) {
        showResult();
    } else {
        renderSingleQuestion();
    }
}

// Eredmény kiírása
function showResult() {
    const div = document.getElementById("quiz");
    div.innerHTML = `
        <h2>Teszt vége!</h2>
        <p>Pontszám: <strong>${score} / 20</strong></p>
        <button onclick="startNewTest()">Új teszt indítása</button>
    `;
}

//HELYES VÁLASZ KIÍRÁSA
function getCorrectAnswerText(q) {
    if (q.tipus === "valasztos" || q.tipus === "igaz_hamis") {
        return escapeHTML(q.valaszok.find(v => v.helyes).szoveg);
    }

    if (q.tipus === "tobbvalasztos") {
        return q.valaszok
            .filter(v => v.helyes)
            .map(v => escapeHTML(v.szoveg))
            .join("<br>");
    }

    if (q.tipus === "sorrend") {
        return [...q.valaszok] 
            .sort((a, b) => a.helyes - b.helyes)
            .map(v => escapeHTML(v.szoveg))
            .join("<br>");
    }

    if (q.tipus === "parositas") {
        return q.valaszok
            .map(v => `${escapeHTML(v.bal)} → ${escapeHTML(v.jobb)}`)
            .join("<br>");
    }

    if (q.tipus === "csoportositas") {
        return q.valaszok
            .map(v => {
                const group = q.csoportok.find(c => c.id === v.csoport);
                return `${escapeHTML(v.szoveg)} → ${escapeHTML(group.nev)}`;
            })
            .join("<br>");
    }


    return "";
}

// Egyszerű feleletválasztós
function renderSingleChoice(div, q) {
    q.valaszok.forEach(v => {
        div.innerHTML += `
            <label>
                <input type="radio" name="${q.id}" value="${v.id}">
                ${escapeHTML(v.szoveg)}
            </label><br>`;
    });
}


function checkSingleChoice(q) {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (!selected) return false;
    const v = q.valaszok.find(x => x.id === selected.value);
    return v && v.helyes === true;
}

// Több helyes válasz
function renderMultiChoice(div, q) {
    q.valaszok.forEach(v => {
        div.innerHTML += `
            <label>
                <input type="checkbox" name="${q.id}" value="${v.id}">
                ${escapeHTML(v.szoveg)}
            </label><br>`;
    });
}

function checkMultiChoice(q) {
    const selected = [...document.querySelectorAll(`input[name="${q.id}"]:checked`)].map(x => x.value);
    const correct = q.valaszok.filter(v => v.helyes).map(v => v.id);
    return JSON.stringify(selected.sort()) === JSON.stringify(correct.sort());
}

// Párosítás
function renderPairing(div, q) {
    q.valaszok.forEach(v => {
        div.innerHTML += `
            <div class="pair-row">
                <strong>${v.bal}</strong> →
                <select name="${q.id}_${v.id}">
                    <option value="">Válassz...</option>
                    ${q.valaszok.map(x => `<option value="${x.jobb}">${x.jobb}</option>`).join("")}
                </select>
            </div>`;
    });
}

function checkPairing(q) {
    return q.valaszok.every(v => {
        const sel = document.querySelector(`select[name="${q.id}_${v.id}"]`).value;
        return sel === v.jobb;
    });
}

// Sorrend
function renderOrdering(div, q) {
    div.innerHTML += `<p>Húzd sorrendbe (1 a legelső):</p>`;
    q.valaszok.forEach(v => {
        div.innerHTML += `
            <div class="pair-row">
                <input type="number" min="1" max="${q.valaszok.length}" name="${q.id}_${v.id}">
                ${v.szoveg}
            </div>`;
    });
}

function checkOrdering(q) {
    return q.valaszok.every(v => {
        const val = document.querySelector(`input[name="${q.id}_${v.id}"]`).value;
        return Number(val) === v.helyes;
    });
}

// Csoportosítás
function renderGrouping(div, q) {
    q.valaszok.forEach(v => {
        div.innerHTML += `
            <div class="group-row">
                ${v.szoveg} →
                <select name="${q.id}_${v.id}">
                    <option value="">Válassz...</option>
                    ${q.csoportok.map(c => `<option value="${c.id}">${c.nev}</option>`).join("")}
                </select>
            </div>`;
    });
}

function checkGrouping(q) {
    return q.valaszok.every(v => {
        const sel = document.querySelector(`select[name="${q.id}_${v.id}"]`).value;
        return sel === v.csoport;
    });
}

