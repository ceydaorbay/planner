const API_URL = "/api/tasks";

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
const todayName = days[new Date().getDay()];

document.addEventListener("DOMContentLoaded", loadTasks);

async function loadTasks() {
    Object.values(columns).forEach(col => { if(col) col.innerHTML = ""; });
    
    try {
        const res = await fetch(API_URL);
        const tasks = await res.json();

        if (!Array.isArray(tasks)) return;

        const todaysTasks = tasks.filter(t => t.day === todayName);
        todaysTasks.forEach(task => createTask(task));

        calculateStats(tasks);
        updateCounts();
    } catch (err) { 
        console.error("Yükleme hatası:", err); 
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
        } else {
            const errData = await res.json();
            alert("Hata: " + errData.error);
        }
    } catch (err) {
        console.error("Ekleme hatası:", err);
    }
}

// Diğer fonksiyonların (calculateStats, createTask, updateTask, updateCounts) 
// mevcut halleriyle kalabilir, ancak API yollarını doğru takip ettiklerinden emin ol.
// updateTask fonksiyonunda fetch(`${API_URL}/${id}`) kısmı artık otomatik /api/tasks/${id} olacaktır.

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
