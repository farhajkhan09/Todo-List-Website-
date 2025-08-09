document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const totalTasksSpan = document.getElementById('totalTasks');
    const completedCountSpan = document.getElementById('completedCount');
    const pendingCountSpan = document.getElementById('pendingCount');
    const allTasksBtn = document.getElementById('allTasks');
    const activeTasksBtn = document.getElementById('activeTasks');
    const completedTasksBtn = document.getElementById('completedTasks');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const localStorageBtn = document.getElementById('localStorageBtn');
    const apiStorageBtn = document.getElementById('apiStorageBtn');
    const storageIndicator = document.getElementById('storageIndicator');
    const editModal = document.getElementById('editModal');
    const editTaskInput = document.getElementById('editTaskInput');
    const closeModal = document.getElementById('closeModal');
    const cancelEdit = document.getElementById('cancelEdit');
    const saveEdit = document.getElementById('saveEdit');

    // State variables
    let tasks = [];
    let currentFilter = 'all';
    let currentStorage = 'local';
    let editingTaskId = null;

    // Initialize the app
    init();

    function init() {
        loadTasks();
        setupEventListeners();
        updateStats();
    }

    function setupEventListeners() {
        // Form submission
        taskForm.addEventListener('submit', addTask);

        // Filter buttons
        allTasksBtn.addEventListener('click', () => filterTasks('all'));
        activeTasksBtn.addEventListener('click', () => filterTasks('active'));
        completedTasksBtn.addEventListener('click', () => filterTasks('completed'));
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);

        // Storage buttons
        localStorageBtn.addEventListener('click', () => switchStorage('local'));
        apiStorageBtn.addEventListener('click', () => switchStorage('api'));

        // Modal buttons
        closeModal.addEventListener('click', closeEditModal);
        cancelEdit.addEventListener('click', closeEditModal);
        saveEdit.addEventListener('click', saveEditedTask);
    }

    // Load tasks based on current storage
    async function loadTasks() {
        if (currentStorage === 'local') {
            tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        } else {
            try {
                // Using JSONPlaceholder as a mock API
                const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=10');
                const apiTasks = await response.json();
                tasks = apiTasks.map(task => ({
                    id: task.id,
                    text: task.title,
                    completed: task.completed
                }));
            } catch (error) {
                console.error('Error fetching tasks:', error);
                tasks = [];
            }
        }
        renderTasks();
    }

    // Add a new task
    async function addTask(e) {
        e.preventDefault();

        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false
        };

        if (currentStorage === 'local') {
            tasks.unshift(newTask);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } else {
            try {
                // Mock API POST request
                const response = await fetch('https://jsonplaceholder.typicode.com/todos', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: taskText,
                        completed: false,
                        userId: 1
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
                const createdTask = await response.json();
                newTask.id = createdTask.id;
                tasks.unshift(newTask);
            } catch (error) {
                console.error('Error adding task:', error);
                return;
            }
        }

        taskInput.value = '';
        renderTasks();
        updateStats();
    }

    // Render tasks based on current filter
    function renderTasks() {
        taskList.innerHTML = '';

        let filteredTasks = [];
        switch (currentFilter) {
            case 'active':
                filteredTasks = tasks.filter(task => !task.completed);
                break;
            case 'completed':
                filteredTasks = tasks.filter(task => task.completed);
                break;
            default:
                filteredTasks = [...tasks];
        }

        if (filteredTasks.length === 0) {
            taskList.appendChild(emptyState);
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item p-4 hover:bg-gray-50 flex items-center justify-between`;
            taskElement.dataset.id = task.id;

            taskElement.innerHTML = `
                        <div class="flex items-center">
                            <label class="checkbox-container flex items-center cursor-pointer">
                                <input type="checkbox" ${task.completed ? 'checked' : ''} class="opacity-0 absolute h-5 w-5">
                                <span class="checkmark bg-white border-2 rounded-md border-blue-500 w-5 h-5 flex flex-shrink-0 justify-center items-center mr-3"></span>
                                <span class="${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}">${task.text}</span>
                            </label>
                        </div>
                        <div class="flex gap-2">
                            <button class="edit-btn p-2 text-blue-500 hover:text-blue-700">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-btn p-2 text-red-500 hover:text-red-700">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;

            taskList.appendChild(taskElement);

            // Add event listeners to the new task
            const checkbox = taskElement.querySelector('input[type="checkbox"]');
            const editBtn = taskElement.querySelector('.edit-btn');
            const deleteBtn = taskElement.querySelector('.delete-btn');

            checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
            editBtn.addEventListener('click', () => openEditModal(task.id));
            deleteBtn.addEventListener('click', () => deleteTask(task.id));
        });
    }

    // Toggle task completion status
    async function toggleTaskComplete(taskId) {
        const taskIndex = tasks.findIndex(task => task.id == taskId);
        if (taskIndex === -1) return;

        tasks[taskIndex].completed = !tasks[taskIndex].completed;

        if (currentStorage === 'local') {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } else {
            try {
                // Mock API PUT request
                await fetch(`https://jsonplaceholder.typicode.com/todos/${taskId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        completed: tasks[taskIndex].completed
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
            } catch (error) {
                console.error('Error updating task:', error);
                // Revert the change if API call fails
                tasks[taskIndex].completed = !tasks[taskIndex].completed;
                return;
            }
        }

        renderTasks();
        updateStats();
    }

    // Delete a task
    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        const taskIndex = tasks.findIndex(task => task.id == taskId);
        if (taskIndex === -1) return;

        if (currentStorage === 'local') {
            tasks.splice(taskIndex, 1);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } else {
            try {
                // Mock API DELETE request
                await fetch(`https://jsonplaceholder.typicode.com/todos/${taskId}`, {
                    method: 'DELETE',
                });
                tasks.splice(taskIndex, 1);
            } catch (error) {
                console.error('Error deleting task:', error);
                return;
            }
        }

        renderTasks();
        updateStats();
    }

    // Filter tasks
    function filterTasks(filter) {
        currentFilter = filter;

        // Update active button styling
        allTasksBtn.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        activeTasksBtn.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        completedTasksBtn.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';

        switch (filter) {
            case 'all':
                allTasksBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg';
                break;
            case 'active':
                activeTasksBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg';
                break;
            case 'completed':
                completedTasksBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg';
                break;
        }

        renderTasks();
    }

    // Clear completed tasks
    async function clearCompletedTasks() {
        if (!confirm('Are you sure you want to clear all completed tasks?')) return;

        if (currentStorage === 'local') {
            tasks = tasks.filter(task => !task.completed);
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } else {
            try {
                // In a real app, you would need to delete each task individually from the API
                // This is just a simulation
                const completedTasks = tasks.filter(task => task.completed);
                for (const task of completedTasks) {
                    await fetch(`https://jsonplaceholder.typicode.com/todos/${task.id}`, {
                        method: 'DELETE',
                    });
                }
                tasks = tasks.filter(task => !task.completed);
            } catch (error) {
                console.error('Error clearing completed tasks:', error);
                return;
            }
        }

        renderTasks();
        updateStats();
    }

    // Open edit modal
    function openEditModal(taskId) {
        const task = tasks.find(task => task.id == taskId);
        if (!task) return;

        editingTaskId = taskId;
        editTaskInput.value = task.text;
        editModal.classList.remove('hidden');
        editTaskInput.focus();
    }

    // Close edit modal
    function closeEditModal() {
        editModal.classList.add('hidden');
        editingTaskId = null;
    }

    // Save edited task
    async function saveEditedTask() {
        const newText = editTaskInput.value.trim();
        if (!newText || !editingTaskId) return;

        const taskIndex = tasks.findIndex(task => task.id == editingTaskId);
        if (taskIndex === -1) return;

        tasks[taskIndex].text = newText;

        if (currentStorage === 'local') {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } else {
            try {
                // Mock API PUT request
                await fetch(`https://jsonplaceholder.typicode.com/todos/${editingTaskId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        title: newText
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
            } catch (error) {
                console.error('Error updating task:', error);
                return;
            }
        }

        closeEditModal();
        renderTasks();
    }

    // Switch between local storage and API storage
    function switchStorage(storageType) {
        if (currentStorage === storageType) return;

        currentStorage = storageType;

        // Update button styling
        localStorageBtn.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        apiStorageBtn.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';

        if (storageType === 'local') {
            localStorageBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition';
            storageIndicator.innerHTML = 'Currently using: <span class="font-medium">Local Storage</span>';
        } else {
            apiStorageBtn.className = 'px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition';
            storageIndicator.innerHTML = 'Currently using: <span class="font-medium">API Storage</span>';
        }

        loadTasks();
    }

    // Update task statistics
    function updateStats() {
        totalTasksSpan.textContent = tasks.length;
        const completedCount = tasks.filter(task => task.completed).length;
        completedCountSpan.textContent = completedCount;
        pendingCountSpan.textContent = tasks.length - completedCount;
    }
});