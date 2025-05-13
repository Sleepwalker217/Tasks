 л// --- Переменные состояния ---
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let calendarTasks = JSON.parse(localStorage.getItem('calendarTasks') || '[]');
let editingTaskId = null;
let draggedTaskId = null;
let theme = localStorage.getItem('theme') || 'dark';

// --- DOM элементы ---
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const modal = document.getElementById('modal');
const taskInput = document.getElementById('task-input');
const saveTaskBtn = document.getElementById('save-task-btn');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const modalTitle = document.getElementById('modal-title');
const calendarGrid = document.getElementById('calendar-grid');
const currentDateSpan = document.getElementById('current-date');
const themeToggle = document.getElementById('theme-toggle');

// --- Инициализация ---
window.onload = () => {
    renderTasks();
    renderCalendar();
    updateCurrentDate();
    applyTheme();
};

// --- События ---
addTaskBtn.onclick = () => openModal();
saveTaskBtn.onclick = saveTask;
cancelTaskBtn.onclick = closeModal;
themeToggle.onclick = toggleTheme;
taskInput.onkeydown = e => { if (e.key === 'Enter') saveTask(); };

// --- Функции задач ---
function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, idx) => {
        const li = document.createElement('li');
        li.textContent = task.text;
        li.draggable = true;
        li.dataset.id = task.id;
        li.ondragstart = () => draggedTaskId = task.id;
        li.ondblclick = () => openModal(task);
        const delBtn = document.createElement('button');
        delBtn.textContent = '✕';
        delBtn.onclick = e => { e.stopPropagation(); deleteTask(task.id); };
        li.appendChild(delBtn);
        taskList.appendChild(li);
    });
}
function openModal(task = null) {
    modal.classList.remove('hidden');
    if (task) {
        editingTaskId = task.id;
        taskInput.value = task.text;
        modalTitle.textContent = 'Редактировать задачу';
    } else {
        editingTaskId = null;
        taskInput.value = '';
        modalTitle.textContent = 'Новая задача';
    }
    setTimeout(() => taskInput.focus(), 100);
}
function closeModal() {
    modal.classList.add('hidden');
    editingTaskId = null;
}
function saveTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    if (editingTaskId) {
        tasks = tasks.map(t => t.id === editingTaskId ? { ...t, text } : t);
        // Синхронизируем текст задачи и на календаре
        calendarTasks = calendarTasks.map(t => t.id === editingTaskId ? { ...t, text } : t);
        localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
        renderCalendar();
    } else {
        const newTask = { id: Date.now(), text };
        tasks.push(newTask);
    }
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
    closeModal();
}
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    // Удаляем связанные задачи с календаря
    calendarTasks = calendarTasks.filter(t => t.id !== id);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
    renderTasks();
    renderCalendar();
}

// --- Календарь ---
const days = ['Вск', 'Пнд', 'Втр', 'Срд', 'Чтв', 'Птн', 'Сбт'];
const startHour = 6, endHour = 22;
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}
function getWeekDates() {
    const start = getStartOfWeek(new Date());
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
}
function renderCalendar() {
    calendarGrid.innerHTML = '';
    const weekDates = getWeekDates();
    // Первая строка: пустая ячейка + дни недели с датами
    const timeHeader = document.createElement('div');
    timeHeader.className = 'calendar-cell';
    timeHeader.style.gridRow = '1';
    timeHeader.style.gridColumn = '1';
    calendarGrid.appendChild(timeHeader);
    for (let d = 0; d < 7; d++) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-cell';
        dayHeader.style.gridRow = '1';
        dayHeader.style.gridColumn = (d + 2);
        dayHeader.innerHTML = `<div>${days[d]}</div><div style='font-size:13px;font-weight:normal;'>${weekDates[d].getDate()}.${weekDates[d].getMonth()+1}</div>`;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        calendarGrid.appendChild(dayHeader);
    }
    // Вертикальные тайминги и ячейки
    for (let h = startHour; h < endHour; h++) {
        // Тайминг
        const timeCell = document.createElement('div');
        timeCell.className = 'calendar-cell';
        timeCell.style.gridRow = (h - startHour + 2);
        timeCell.style.gridColumn = '1';
        timeCell.style.textAlign = 'right';
        timeCell.style.fontSize = '13px';
        timeCell.style.color = '#888';
        timeCell.style.paddingRight = '6px';
        timeCell.style.background = 'var(--calendar-bg)';
        timeCell.textContent = `${h}:00`;
        calendarGrid.appendChild(timeCell);
        // Ячейки дней
        for (let d = 0; d < 7; d++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            cell.style.gridRow = (h - startHour + 2);
            cell.style.gridColumn = (d + 2);
            cell.ondragover = e => e.preventDefault();
            cell.ondrop = e => onDropTask(d, h);
            calendarGrid.appendChild(cell);
        }
    }
    // Отрисовка задач на календаре
    calendarTasks.forEach(task => {
        const block = document.createElement('div');
        block.className = 'task-block';
        block.textContent = task.text;
        block.style.gridColumn = (task.day + 2);
        block.style.gridRow = (task.hour - startHour + 2) + ' / span ' + (task.duration || 1);
        block.onclick = () => editCalendarTask(task.id);
        block.draggable = true;
        block.ondragstart = () => draggedTaskId = task.id;
        // Добавляю resize-handle
        const resize = document.createElement('div');
        resize.className = 'resize-handle';
        resize.onmousedown = e => startResize(e, task);
        block.appendChild(resize);
        calendarGrid.appendChild(block);
    });
}
let resizingTask = null;
let startY = 0;
let startDuration = 1;
function startResize(e, task) {
    e.stopPropagation();
    resizingTask = task;
    startY = e.clientY;
    startDuration = task.duration || 1;
    document.body.style.cursor = 'ns-resize';
    document.onmousemove = onResize;
    document.onmouseup = stopResize;
}
function onResize(e) {
    if (!resizingTask) return;
    const delta = e.clientY - startY;
    let newDuration = Math.max(1, startDuration + Math.round(delta / 40));
    resizingTask.duration = newDuration;
    localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
    renderCalendar();
}
function stopResize() {
    resizingTask = null;
    document.body.style.cursor = '';
    document.onmousemove = null;
    document.onmouseup = null;
}
function onDropTask(day, hour) {
    if (!draggedTaskId) return;
    // Если таск из списка задач
    const task = tasks.find(t => t.id == draggedTaskId);
    const alreadyOnCalendar = calendarTasks.some(t => t.id == draggedTaskId);
    if (task && !alreadyOnCalendar) {
        calendarTasks.push({
            id: task.id, // Используем тот же id, что и у задачи
            text: task.text,
            day,
            hour,
            duration: 1
        });
        localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
        renderCalendar();
        draggedTaskId = null;
        return;
    }
    // Если таск уже на календаре (перетаскивание)
    const calTask = calendarTasks.find(t => t.id == draggedTaskId);
    if (calTask) {
        calTask.day = day;
        calTask.hour = hour;
        localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
        renderCalendar();
        draggedTaskId = null;
    }
}
function editCalendarTask(id) {
    const calTask = calendarTasks.find(t => t.id === id);
    if (!calTask) return;
    openModal({ id, text: calTask.text });
    saveTaskBtn.onclick = function() {
        const text = taskInput.value.trim();
        if (!text) return;
        calTask.text = text;
        localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
        renderCalendar();
        closeModal();
        saveTaskBtn.onclick = saveTask;
    };
    cancelTaskBtn.onclick = function() {
        closeModal();
        saveTaskBtn.onclick = saveTask;
    };
}

// --- Текущая дата и курсор времени ---
function updateCurrentDate() {
    const now = new Date();
    currentDateSpan.textContent = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setTimeout(updateCurrentDate, 60000);
}

// --- Тема ---
function applyTheme() {
    if (theme === 'light') {
        document.body.classList.add('light');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('light');
        themeToggle.textContent = '🌙';
    }
}
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    applyTheme();
} 