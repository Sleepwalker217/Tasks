// --- Переменные состояния ---
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let calendarTasks = JSON.parse(localStorage.getItem('calendarTasks') || '[]');
let editingTaskId = null;
let draggedTaskId = null;
let theme = localStorage.getItem('theme') || 'dark';
let currentWeekOffset = 0; // Добавляем смещение текущей недели
let calendarScale = parseFloat(localStorage.getItem('calendarScale')) || 1;

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
const prevWeekBtn = document.getElementById('prev-week-btn');
const nextWeekBtn = document.getElementById('next-week-btn');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomSlider = document.getElementById('zoom-slider');
const exportTasksBtn = document.getElementById('export-tasks-btn');
const importTasksBtn = document.getElementById('import-tasks-btn');
const importFileInput = document.getElementById('import-file-input');

// --- Инициализация ---
window.onload = () => {
    renderTasks();
    renderCalendar();
    updateCurrentDate();
    applyTheme();
    setupWeekNavigation();
    setupZoomControls();
    applyCalendarScale();
    setupExportImport();
};

// --- Масштабирование календаря ---
function setupZoomControls() {
    // Устанавливаем начальное значение слайдера
    zoomSlider.value = calendarScale * 100;
    
    zoomInBtn.onclick = () => {
        calendarScale = Math.min(2, calendarScale + 0.1);
        zoomSlider.value = calendarScale * 100;
        applyCalendarScale();
    };
    
    zoomOutBtn.onclick = () => {
        calendarScale = Math.max(0.5, calendarScale - 0.1);
        zoomSlider.value = calendarScale * 100;
        applyCalendarScale();
    };

    zoomSlider.oninput = () => {
        calendarScale = zoomSlider.value / 100;
        applyCalendarScale();
    };
}

function applyCalendarScale() {
    const container = document.querySelector('.calendar-container');
    const grid = document.getElementById('calendar-grid');
    
    // Сохраняем текущую позицию прокрутки
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    
    // Применяем масштаб
    grid.style.transform = `scale(${calendarScale})`;
    grid.style.width = `${100 / calendarScale}%`;
    grid.style.height = `${100 / calendarScale}%`;
    
    // Восстанавливаем позицию прокрутки
    container.scrollLeft = scrollLeft;
    container.scrollTop = scrollTop;
    
    localStorage.setItem('calendarScale', calendarScale.toString());
}

// --- Экспорт/Импорт задач ---
function setupExportImport() {
    exportTasksBtn.onclick = exportTasks;
    importTasksBtn.onclick = () => importFileInput.click();
    importFileInput.onchange = importTasks;
}

function exportTasks() {
    const data = JSON.stringify(calendarTasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importTasks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTasks = JSON.parse(e.target.result);
            if (Array.isArray(importedTasks)) {
                calendarTasks = importedTasks;
                localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
                renderCalendar();
                renderTasks();
            } else {
                alert('Некорректный формат файла');
            }
        } catch (error) {
            alert('Ошибка при чтении файла');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Сброс input для возможности повторного выбора того же файла
}

// --- События ---
addTaskBtn.onclick = () => openModal();
saveTaskBtn.onclick = saveTask;
cancelTaskBtn.onclick = closeModal;
themeToggle.onclick = toggleTheme;
taskInput.onkeydown = e => { if (e.key === 'Enter') saveTask(); };

// --- Навигация по неделям ---
function updateAddButtonVisibility() {
    const weekDates = getWeekDates();
    const today = new Date();
    const isCurrentWeek = weekDates.some(date => 
        date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear()
    );
    
    addTaskBtn.style.display = isCurrentWeek ? 'flex' : 'none';
}

function updateSidebarTitle() {
    const title = document.querySelector('.sidebar h2');
    title.textContent = 'Задачи на неделю';
}

function setupWeekNavigation() {
    prevWeekBtn.onclick = () => {
        currentWeekOffset--;
        renderCalendar();
        renderTasks();
        updateSidebarTitle();
        updateAddButtonVisibility();
    };
    nextWeekBtn.onclick = () => {
        currentWeekOffset++;
        renderCalendar();
        renderTasks();
        updateSidebarTitle();
        updateAddButtonVisibility();
    };
    updateSidebarTitle();
    updateAddButtonVisibility();
}

// --- Функции задач ---
function renderTasks() {
    taskList.innerHTML = '';
    const weekDates = getWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    // Фильтруем задачи только для текущей недели
    const weekTasks = calendarTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate >= weekStart && taskDate <= weekEnd;
    });

    weekTasks.forEach((task, idx) => {
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
        // Добавляем задачу в calendarTasks с текущей датой
        const weekDates = getWeekDates();
        const today = new Date();
        const currentDay = weekDates.findIndex(date => 
            date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()
        );
        
        if (currentDay !== -1) {
            calendarTasks.push({
                id: newTask.id,
                text: newTask.text,
                date: today.toISOString(),
                hour: new Date().getHours(),
                duration: 1
            });
            localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
            renderCalendar();
        }
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
const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const startHour = 0, endHour = 24;
const MINUTES_PER_CELL = 15; // 15 минут на ячейку

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function getWeekDates() {
    const start = getStartOfWeek(new Date());
    start.setDate(start.getDate() + (currentWeekOffset * 7));
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
        const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        dayHeader.innerHTML = `<div class='calendar-day-title'>${days[d]}</div><div class='calendar-day-date'>${weekDates[d].getDate()} ${monthNames[weekDates[d].getMonth()]}</div>`;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        calendarGrid.appendChild(dayHeader);
    }

    // Вертикальные тайминги и ячейки
    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += MINUTES_PER_CELL) {
            const rowIndex = ((h - startHour) * 4) + (m / MINUTES_PER_CELL) + 2;
            
            // Тайминг (только для полных часов)
            if (m === 0) {
                const timeCell = document.createElement('div');
                timeCell.className = 'calendar-cell';
                timeCell.style.gridRow = `${rowIndex} / span 4`;
                timeCell.style.gridColumn = '1';
                timeCell.style.textAlign = 'right';
                timeCell.style.fontSize = '13px';
                timeCell.style.color = '#888';
                timeCell.style.paddingRight = '6px';
                timeCell.style.background = 'var(--calendar-bg)';
                timeCell.textContent = `${h.toString().padStart(2, '0')}:00`;
                calendarGrid.appendChild(timeCell);
            }

            // Ячейки дней
            for (let d = 0; d < 7; d++) {
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                // Добавляем класс для ячеек целых часов
                if (m === 0) {
                    cell.classList.add('hour-line');
                }
                cell.style.gridRow = rowIndex;
                cell.style.gridColumn = (d + 2);
                cell.ondragover = e => e.preventDefault();
                cell.ondrop = e => onDropTask(d, h, m);
                calendarGrid.appendChild(cell);
            }
        }
    }

    // Отрисовка задач на календаре
    calendarTasks.forEach(task => {
        const taskDate = new Date(task.date);
        const weekDates = getWeekDates();
        const dayIndex = weekDates.findIndex(date => 
            date.getDate() === taskDate.getDate() && 
            date.getMonth() === taskDate.getMonth() && 
            date.getFullYear() === taskDate.getFullYear()
        );
        
        if (dayIndex !== -1) {
            const block = document.createElement('div');
            block.className = 'task-block';
            block.textContent = task.text;
            block.style.gridColumn = (dayIndex + 2);
            
            const startRow = ((task.hour - startHour) * 4) + (task.minute / MINUTES_PER_CELL) + 2;
            const durationInCells = Math.max(1, (task.duration || 1) * 4);
            block.style.gridRow = `${startRow} / span ${durationInCells}`;
            
            block.onclick = () => editCalendarTask(task.id);
            block.draggable = true;
            block.ondragstart = () => draggedTaskId = task.id;
            
            const resize = document.createElement('div');
            resize.className = 'resize-handle';
            resize.onmousedown = e => startResize(e, task);
            block.appendChild(resize);
            calendarGrid.appendChild(block);
        }
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
    const cellHeight = 40; // Высота ячейки в пикселях
    const cellsPerHour = 4; // 4 ячейки по 15 минут в часе
    let newDuration = Math.max(0.25, startDuration + (delta / (cellHeight * cellsPerHour)));
    resizingTask.duration = Math.round(newDuration * 4) / 4; // Округляем до 15 минут
    localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
    renderCalendar();
}
function stopResize() {
    resizingTask = null;
    document.body.style.cursor = '';
    document.onmousemove = null;
    document.onmouseup = null;
}
function onDropTask(day, hour, minute) {
    if (!draggedTaskId) return;
    
    const task = tasks.find(t => t.id == draggedTaskId);
    const alreadyOnCalendar = calendarTasks.some(t => t.id == draggedTaskId);
    
    if (task && !alreadyOnCalendar) {
        const weekDates = getWeekDates();
        const date = weekDates[day];
        calendarTasks.push({
            id: task.id,
            text: task.text,
            date: date.toISOString(),
            hour,
            minute,
            duration: 1
        });
        localStorage.setItem('calendarTasks', JSON.stringify(calendarTasks));
        renderCalendar();
        draggedTaskId = null;
        return;
    }
    
    const calTask = calendarTasks.find(t => t.id == draggedTaskId);
    if (calTask) {
        const weekDates = getWeekDates();
        const date = weekDates[day];
        calTask.date = date.toISOString();
        calTask.hour = hour;
        calTask.minute = minute;
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