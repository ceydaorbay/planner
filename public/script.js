const API_URL = window.location.origin + "/tasks";

const columns = {
    todo: document.getElementById("todoList"),
    doing: document.getElementById("doingList"),
    done: document.getElementById("doneList")
};

const counts = {
    todo: document.getElementById("todoCount"),
    doing: document.getElementById("doingCount"),
    done: document.getElementById("doneCount")
};

const statsContainer = document.getElementById("stats");
const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const todayName = days[new Date().getDay()]; // Otomatik gün tespiti

document.addEventListener("DOMContentLoaded", loadTasks);

async function loadTasks() {
    // Ekranı temizle
    Object.values(columns).forEach(col => col.innerHTML = "");
    
    try {
        const res = await fetch(API_URL);
        const tasks = await res.json();

        // KRİTİK KONTROL: Eğer sunucudan dizi gelmezse (hata dönerse) sistemi durdur ve uyar
        if (!Array.isArray(tasks)) {
            console.error("Hata: Sunucudan görev listesi yerine başka bir veri geldi:", tasks);
            return;
        }

        // Sadece bugünün görevlerini panoda göster
        const todaysTasks = tasks.filter(t => t.day === todayName);
        todaysTasks.forEach(task => createTask(task));

        // Tüm haftanın verisiyle istatistikleri güncelle
        calculateStats(tasks);
        updateCounts();
    } catch (err) { 
        console.error("Yükleme hatası (Bağlantı sorunu olabilir):", err); 
    }
}

async function addTask() {
    const taskInput = document.getElementById("taskInput");
    const statusInput = document.getElementById("statusInput");
    const text = taskInput.value.trim();
    if (!text) return;

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, status: statusInput.value, day: todayName })
        });
        
        if (res.ok) {
            taskInput.value = "";
            loadTasks();
        }
    } catch (err) {
        console.error("Ekleme hatası:", err);
    }
}

function calculateStats(allTasks) {
    if (!statsContainer) return;
    statsContainer.innerHTML = `<h3>Haftalık İstatistik (${todayName})</h3>`;
    let totalTasks = 0, totalDone = 0;
    let bestDay = "", bestPercent = -1;
    const displayOrder = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

    displayOrder.forEach(day => {
        // Her ihtimale karşı allTasks'ın array olduğunu teyit ediyoruz
        const dayTasks = Array.isArray(allTasks) ? allTasks.filter(t => t.day === day) : [];
        const done = dayTasks.filter(t => t.status === "done").length;
        const percent = dayTasks.length ? Math.round(done / dayTasks.length * 100) : 0;

        totalTasks += dayTasks.length;
        totalDone += done;
        if (percent > bestPercent && dayTasks.length > 0) {
            bestPercent = percent; bestDay = day;
        }

        statsContainer.innerHTML += `
            <div class="day">
                ${day} – %${percent}
                <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
            </div>`;
    });

    const weekPercent = totalTasks ? Math.round(totalDone / totalTasks * 100) : 0;
    statsContainer.innerHTML += `
        <div class="total">
            Hafta Geneli: %${weekPercent}<br>
            <span class="best">En Verimli Gün: ${bestDay || "-"}</span>
        </div>`;
}

function createTask(task) {
    if (!columns[task.status]) return;
    
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.id = task.id;
    li.innerHTML = `<span>${task.text}</span>`;

    const btns = document.createElement("div");
    btns.className = "buttons";

    if (task.status !== "done") {
        const finish = document.createElement("button");
        finish.className = "finish-btn"; finish.textContent = "Bitti ✓";
        finish.onclick = async () => { await updateTask(task.id, "done"); loadTasks(); };
        btns.appendChild(finish);
    }

    const del = document.createElement("button");
    del.className = "delete-btn"; del.textContent = "✕";
    del.onclick = async () => { 
        await fetch(`${API_URL}/${task.id}`, { method: "DELETE" }); 
        loadTasks(); 
    };

    btns.appendChild(del);
    li.appendChild(btns);

    li.addEventListener("dragstart", () => li.classList.add("dragging"));
    li.addEventListener("dragend", async () => {
        li.classList.remove("dragging");
        const newStatus = li.parentElement.dataset.status;
        if (newStatus) {
            await updateTask(task.id, newStatus);
            loadTasks();
        }
    });

    columns[task.status].appendChild(li);
}

async function updateTask(id, status) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
    } catch (err) {
        console.error("Güncelleme hatası:", err);
    }
}

function updateCounts() {
    Object.keys(columns).forEach(k => { 
        if (counts[k]) counts[k].textContent = columns[k].children.length; 
    });
}

Object.values(columns).forEach(col => {
    col.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = document.querySelector(".dragging");
        if (dragging) col.appendChild(dragging);
    });
});
