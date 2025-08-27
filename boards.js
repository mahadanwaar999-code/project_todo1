
// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggleBtn');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Local Storage Functions
function initLocalStorage() {
    const currentUser = localStorage.getItem('currentUser');
    const storedBoards = localStorage.getItem('trelloBoards');
    if (storedBoards) {
        const allBoards = JSON.parse(storedBoards);
        // Filter boards by current user
        return allBoards.filter(board => board.user === currentUser);
    }
    return [];
}

function saveBoardsToLocalStorage(boards) {
    const currentUser = localStorage.getItem('currentUser');
    const storedBoards = localStorage.getItem('trelloBoards');
    let allBoards = storedBoards ? JSON.parse(storedBoards) : [];
    // Remove current user's boards to avoid duplicates
    allBoards = allBoards.filter(board => board.user !== currentUser);
    // Append current user's boards
    allBoards = allBoards.concat(boards);
    localStorage.setItem('trelloBoards', JSON.stringify(allBoards));
}

function clearLocalStorage() {
    localStorage.removeItem('trelloBoards');
    localStorage.removeItem('currentUser');
}

// Data Structure
let boards = initLocalStorage();
let isUpdate = false;
let updateIndex = -1;
let timeUpdateInterval = null;
let isFolderUpdate = false;
let updateFolderBoardIndex = -1;
let updateFolderIndex = -1;
let currentViewBoardIndex = -1;

// Function to hide modal
function hideModal(modalId) {
    let modal = document.getElementById(modalId);
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    let backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) backdrop.remove();
}

// Get Remaining Time
function getRemainingTime(end) {
    if (!end) return "N/A";
    let endDate = new Date(end);
    let now = new Date();
    if (endDate <= now) return "Expired";
    let diff = endDate - now;
    let hours = Math.floor(diff / 3600000);
    let minutes = Math.floor((diff % 3600000) / 60000);
    let seconds = Math.floor((diff % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Update dropdowns dynamically when boards/folders change
function updateDropdowns() {
    let boardSelectFolder = document.getElementById("boardSelectFolder");
    let boardSelectTask = document.getElementById("boardSelectTask");
    let folderSelectTask = document.getElementById("folderSelectTask");

    // Clear existing options
    boardSelectFolder.innerHTML = "";
    boardSelectTask.innerHTML = "";
    folderSelectTask.innerHTML = "";

    // Populate Board options
    boards.forEach((b, i) => {
        boardSelectFolder.innerHTML += `<option value="${i}">${b.name}</option>`;
        boardSelectTask.innerHTML += `<option value="${i}">${b.name}</option>`;
    });

    // Reset folder dropdown when board changes
    boardSelectTask.onchange = function () {
        folderSelectTask.innerHTML = "";
        let idx = boardSelectTask.value;
        if (boards[idx]) {
            boards[idx].folders.forEach((f, j) => {
                folderSelectTask.innerHTML += `<option value="${j}">${f.name}</option>`;
            });
        }
    };

    // Force select first board and trigger onchange for folders
    if (boards.length > 0) {
        boardSelectTask.value = "0";
        boardSelectTask.onchange();
    }
}

function showCustomAlert(message) {
    document.getElementById("customAlertMessage").innerText = message;
    document.getElementById("customAlert").style.display = "flex";

    // Close alert on button click
    document.getElementById("customAlertOk").onclick = function() {
        document.getElementById("customAlert").style.display = "none";
    }
}

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", function () {
    // Redirect to login if no user is logged in
    if (!localStorage.getItem('currentUser')) {
        window.location.href = "../index.html";
        return;
    }

    // Search functionality for boards
    let searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", renderBoards);
    }

    // Save Board
    document.getElementById("saveBoard").addEventListener("click", (e) => {
        e.preventDefault();

        let boardName = document.getElementById("boardName").value.trim();
        let boardDesc = document.getElementById("boardDesc").value.trim();
        let startTime = document.getElementById("startTime").value;
        let endTime = document.getElementById("endTime").value;
        let priority = document.getElementById("Priority").value;
        const currentUser = localStorage.getItem('currentUser');

        if (!boardName) {
            showCustomAlert("Board Name is required!");
            return;
        }

        if (isUpdate) {
            boards[updateIndex].name = boardName;
            boards[updateIndex].desc = boardDesc;
            boards[updateIndex].start = startTime;
            boards[updateIndex].end = endTime;
            boards[updateIndex].status = priority;
            boards[updateIndex].updateCount++;
            showCustomAlert("Board updated successfully!");
            isUpdate = false;
            updateIndex = -1;
            document.getElementById("saveBoard").innerText = "Save";
            let modalTitle = document.querySelector("#addBoardModal .modal-title");
            if (modalTitle) modalTitle.innerText = "Add Board";
        } else {
            let newBoard = {
                user: currentUser,
                name: boardName,
                desc: boardDesc,
                start: startTime,
                end: endTime,
                status: priority,
                folders: [],
                updateCount: 0
            };
            boards.push(newBoard);
            showCustomAlert("Board added successfully!");
        }

        updateDropdowns();
        saveBoardsToLocalStorage(boards);
        document.querySelectorAll("#addBoardModal input, #addBoardModal textarea").forEach(el => el.value = "");
        hideModal("addBoardModal");
    });

    // Save/Update Folder
    document.getElementById("saveFolder").addEventListener("click", (e) => {
        e.preventDefault();

        let newBoardIdx = document.getElementById("boardSelectFolder").value;
        let folderName = document.getElementById("folderName").value.trim();

        if (!folderName) {
            showCustomAlert("Folder name cannot be empty!");
            return;
        }

        if (isFolderUpdate) {
            let folder = boards[updateFolderBoardIndex].folders[updateFolderIndex];
            folder.name = folderName;

            if (newBoardIdx != updateFolderBoardIndex) {
                boards[updateFolderBoardIndex].folders.splice(updateFolderIndex, 1);
                boards[newBoardIdx].folders.push(folder);
            }

            showCustomAlert("✅ Folder updated successfully!");
            isFolderUpdate = false;
            updateFolderBoardIndex = -1;
            updateFolderIndex = -1;
            document.getElementById("saveFolder").innerText = "Save";
            let modalTitle = document.querySelector("#addFolderModal .modal-title");
            if (modalTitle) modalTitle.innerText = "Add Folder";
        } else {
            boards[newBoardIdx].folders.push({ name: folderName, tasks: [] });
            showCustomAlert("✅ Folder added successfully!");
        }

        updateDropdowns();
        saveBoardsToLocalStorage(boards);
        document.getElementById("folderName").value = "";
        hideModal("addFolderModal");
        if (currentViewBoardIndex !== -1) {
            viewBoard(currentViewBoardIndex);
        }
    });

    // Save Task
    document.getElementById("saveTask").addEventListener("click", (e) => {
        e.preventDefault();

        let bIdx = document.getElementById("boardSelectTask").value;
        let fIdx = document.getElementById("folderSelectTask").value;

        let newTask = {
            name: document.getElementById("taskName").value.trim(),
            desc: document.getElementById("taskDesc").value.trim(),
            start: document.getElementById("taskStartTime").value,
            end: document.getElementById("taskEndTime").value,
            priority: document.getElementById("taskPriority").value,
            status: 'Pending'
        };

        if (!newTask.name) {
            showCustomAlert("Task name cannot be empty!");
            return;
        }

        boards[bIdx].folders[fIdx].tasks.push(newTask);
        showCustomAlert("Task added successfully!");
        saveBoardsToLocalStorage(boards);

        document.querySelectorAll("#addTaskModal input, #addTaskModal textarea").forEach(el => el.value = "");
        hideModal("addTaskModal");
        if (currentViewBoardIndex !== -1) {
            viewBoard(currentViewBoardIndex);
        }
    });
});

// Update Remaining Times
function updateRemainingTimes() {
    document.querySelectorAll("#main_card td[data-end], #main_card .task-remaining-time[data-end]").forEach(el => {
        let rem = getRemainingTime(el.dataset.end);
        if (el.querySelector("i")) {
            el.querySelector("i").title = rem;
            el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${rem}`;
        } else {
            el.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${rem}`;
        }
    });
}

// Update Table Headers and Responsive Changes
function updateTableHeaders() {
    const isSmallScreen = window.matchMedia("(max-width: 576px)").matches;
    const shortHeaders = ["Bd", "Pty", "Rm", "Act"];
    const fullHeaders = ["Board", "Priority", "Remaining Time", "Actions"];

    document.querySelectorAll(".table-header th").forEach((th, index) => {
        th.innerText = isSmallScreen ? shortHeaders[index] : fullHeaders[index];
    });

    document.querySelectorAll("#main_card tbody tr").forEach(row => {
        const priorityCell = row.querySelector("td:nth-child(2) span");
        const timeCell = row.querySelector("td:nth-child(3)");
        const actionsCell = row.querySelector("td:nth-child(4)");
        const index = row.dataset.index;

        if (isSmallScreen) {
            if (priorityCell) {
                const fullText = priorityCell.innerText;
                const shortMap = { "High": "Hg", "Medium": "Md", "Low": "Lw" };
                priorityCell.innerText = shortMap[fullText] || fullText;
                priorityCell.title = fullText;
            }

            if (timeCell) {
                const timeText = timeCell.innerText || timeCell.querySelector("i")?.title || getRemainingTime(timeCell.dataset.end);
                timeCell.innerHTML = `<i class="fa-solid fa-hourglass-half" title="${timeText}"></i>`;
            }

            if (actionsCell) {
                actionsCell.innerHTML = `
                    <button class="btn btn-sm text-light mb-2" style="background-color:#6f42c1;" onclick="updateBoard(${index})" title="Update">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-sm text-light mb-2" style="background-color:#6f42c1;" onclick="viewBoard(${index})" title="View">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                `;
            }
        } else {
            if (priorityCell && priorityCell.title) {
                priorityCell.innerText = priorityCell.title;
                priorityCell.title = "";
            }

            if (timeCell) {
                const icon = timeCell.querySelector("i");
                if (icon && icon.title) {
                    timeCell.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${icon.title}`;
                }
            }

            if (actionsCell) {
                actionsCell.innerHTML = `
                    <button class="btn btn-sm text-light mb-2" style="background-color:#6f42c1;" onclick="updateBoard(${index})">Update</button>
                    <button class="btn btn-sm text-light mb-2" style="background-color:#6f42c1;" onclick="viewBoard(${index})">View</button>
                `;
            }
        }
    });
}

// Call on load and on resize
window.addEventListener("load", updateTableHeaders);
window.addEventListener("resize", () => {
    updateTableHeaders();
    updateRemainingTimes();
});

// Render Boards with Search Filter
function renderBoards() {
    let main_card = document.getElementById("main_card");
    main_card.innerHTML = "";

    let searchValue = document.getElementById("searchInput")?.value.toLowerCase() || "";
    currentViewBoardIndex = -1;

    if (timeUpdateInterval) clearInterval(timeUpdateInterval);

    let hasBoards = false;

    let html = `<h4 class="text-center mb-3">All Boards</h4>`;

    html += `
        <div class="table-responsive">
            <table class="table table-bordered table-striped align-middle text-center">
                <thead class="table-light">
                    <tr class="table-header">
                        <th>Board</th>
                        <th>Priority</th>
                        <th>Remaining Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    boards.forEach((board, index) => {
        if (board.name.toLowerCase().includes(searchValue)) {
            hasBoards = true;
            let remainingTime = getRemainingTime(board.end);

            html += `
                <tr data-index="${index}">
                    <td><b>${board.name}</b></td>
                    <td><span class="badge" style="background-color: #6f42c1;">${board.status}</span></td>
                    <td data-end="${board.end}"><i class="fa-solid fa-clock-rotate-left"></i> ${remainingTime}</td>
                    <td>
                        <button class="btn btn-sm text-light mb-2" style="background-color: #6f42c1;" onclick="updateBoard(${index})">Update</button>
                        <button class="btn btn-sm text-light mb-2" style="background-color: #6f42c1;" onclick="viewBoard(${index})">View</button>
                    </td>
                </tr>
            `;
        }
    });

    html += `</tbody></table></div>`;

    if (!hasBoards) {
        main_card.innerHTML = `<p class='text-center text-muted'>No boards available</p>`;
        return;
    }

    main_card.innerHTML = html;
    updateTableHeaders();
    timeUpdateInterval = setInterval(updateRemainingTimes, 1000);
}

// Update Board Functionality (limited to 3 times)
function updateBoard(index) {
    if (boards[index].updateCount >= 3) {
        showCustomAlert("You can update this board only 3 times!");
        return;
    }

    isUpdate = true;
    updateIndex = index;

    document.getElementById("boardName").value = boards[index].name;
    document.getElementById("boardDesc").value = boards[index].desc;
    document.getElementById("startTime").value = boards[index].start;
    document.getElementById("endTime").value = boards[index].end;
    document.getElementById("Priority").value = boards[index].status;

    let modal = document.getElementById("addBoardModal");
    let modalTitle = modal.querySelector(".modal-title");
    if (modalTitle) modalTitle.innerText = "Update Board";
    document.getElementById("saveBoard").innerText = "Update";

    modal.classList.add('show');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    let backdrop = document.createElement('div');
    backdrop.classList.add('modal-backdrop', 'fade', 'show');
    document.body.appendChild(backdrop);
}

// Update Folder Functionality
function updateFolder(boardIdx, folderIdx) {
    isFolderUpdate = true;
    updateFolderBoardIndex = boardIdx;
    updateFolderIndex = folderIdx;

    let folder = boards[boardIdx].folders[folderIdx];

    document.getElementById("boardSelectFolder").value = boardIdx;
    document.getElementById("folderName").value = folder.name;

    let modal = document.getElementById("addFolderModal");
    let modalTitle = modal.querySelector(".modal-title");
    if (modalTitle) modalTitle.innerText = "Update Folder";
    document.getElementById("saveFolder").innerText = "Update";

    modal.classList.add('show');
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    let backdrop = document.createElement('div');
    backdrop.classList.add('modal-backdrop', 'fade', 'show');
    document.body.appendChild(backdrop);
}

// Delete Task Functionality
function deleteTask(boardIdx, folderIdx, taskIdx) {
    if (confirm("Are you sure you want to delete this task?")) {
        boards[boardIdx].folders[folderIdx].tasks.splice(taskIdx, 1);
        showCustomAlert("Task deleted successfully!");
        saveBoardsToLocalStorage(boards);
        viewBoard(currentViewBoardIndex);
    }
}

// View Board Functionality with Search for Folders/Tasks
function viewBoard(index) {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);

    currentViewBoardIndex = index;
    let board = boards[index];
    let remaining = getRemainingTime(board.end);

    let html = `
       
        <h3>${board.name}</h3>
         <div  style="padding: 15px;">
        <p>Description: ${board.desc || 'N/A'}</p>
        <p>Start: ${board.start || 'N/A'}</p>
        <p>End: ${board.end || 'N/A'}</p>
        <p>Priority: ${board.status}</p>
        <p><span class="task-remaining-time" data-end="${board.end}"><i class="fa-solid fa-clock-rotate-left"></i> ${remaining}</span></p>
        </div>
        <h4>Folders</h4>
        <input type="text" id="viewSearch" placeholder="Search folders " class="form-control mb-3">
        <div id="foldersList">
    `;

    board.folders.forEach((folder, fIdx) => {
        html += `
            <div class="folder-item" data-name="${folder.name.toLowerCase()}">
                <div class="folder-header">
                    <h5>${folder.name}</h5>
                    <button class="btn btn-sm text-light" style="background-color:#6f42c1;" onclick="updateFolder(${index}, ${fIdx})">Update</button>
                </div>
                <h6 style="padding: 15px;">Tasks</h6>
                <div class="task-search-container " style="padding: 15px;">
                    <input type="text" id="taskSearch-${fIdx}" placeholder="Search tasks" class="form-control">
                </div>
                <ul id="taskList-${fIdx}">
        `;
        folder.tasks.forEach((task, tIdx) => {
            let statusClass = task.status ? task.status.toLowerCase() : 'pending';
            let borderColor;
            switch (statusClass) {
                case 'pending': borderColor = 'yellow'; break;
                case 'completed': borderColor = 'green'; break;
                case 'inprocess': borderColor = 'blue'; break;
                case 'terminated': borderColor = 'red'; break;
                default: borderColor = '#6f42c1';
            }
            let taskRemaining = getRemainingTime(task.end);
            html += `
                <li class="task-item ${statusClass}" data-name="${task.name.toLowerCase()}" data-desc="${task.desc.toLowerCase()}" style="border-left-color: ${borderColor};">
                    <div class="task-details" style="padding: 15px;">
                        <p>Task: ${task.name || 'N/A'}</p>
                        <p>Description: ${task.desc || 'N/A'}</p>
                        <p>Start: ${task.start || 'N/A'}</p>
                        <p>End: ${task.end || 'N/A'}</p>
                        <p>Priority: ${task.priority}</p>
                        <p>Status: ${task.status || 'Pending'}</p>
                        <p><span class="task-remaining-time" data-end="${task.end}"><i class="fa-solid fa-clock-rotate-left"></i> ${taskRemaining}</span></p>
                        <label class="text-light p-1" style="background-color: #6f42c1;">Change Status</label>
                         <select class="task-status-select" onchange="updateTaskStatus(${index}, ${fIdx}, ${tIdx}, this.value, this.parentElement.parentElement)">
                            <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Inprocess" ${task.status === 'Inprocess' ? 'selected' : ''}>Inprocess</option>
                            <option value="Terminated" ${task.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
                        </select>
                        <button class="btn btn-delete-task" onclick="deleteTask(${index}, ${fIdx}, ${tIdx})">Delete</button>

                    </div>
                    
                </li>
            `;
        });
        html += `</ul>
                <p class="no-match-message" id="noMatch-${fIdx}" style="display: none;">No tasks match your search</p>
            </div>`;
    });

    html += `
        </div>
        <button class="btn btn-sm text-light mt-3 mb-4" style="background-color:#6f42c1;" onclick="renderBoards()">Back to Boards</button>
    `;

    document.getElementById("main_card").innerHTML = html;

    // Folder/Task search
    document.getElementById("viewSearch").addEventListener("input", function () {
        let val = this.value.toLowerCase();
        document.querySelectorAll(".folder-item").forEach(folder => {
            let showFolder = folder.dataset.name.includes(val);
            let taskCount = 0;
            folder.querySelectorAll(".task-item").forEach(li => {
                let showTask = li.dataset.name.includes(val) || li.dataset.desc.includes(val);
                li.style.display = showTask ? "" : "none";
                if (showTask) {
                    showFolder = true;
                    taskCount++;
                }
            });
            folder.style.display = showFolder ? "" : "none";
        });
    });

    // Task search per folder
    board.folders.forEach((_, fIdx) => {
        let taskSearchInput = document.getElementById(`taskSearch-${fIdx}`);
        if (taskSearchInput) {
            taskSearchInput.addEventListener("input", function () {
                let val = this.value.toLowerCase();
                let folder = document.querySelectorAll(".folder-item")[fIdx];
                let taskList = folder.querySelector(`#taskList-${fIdx}`);
                let noMatchMessage = folder.querySelector(`#noMatch-${fIdx}`);
                let taskCount = 0;
                folder.querySelectorAll(".task-item").forEach(li => {
                    let showTask = li.dataset.name.includes(val) || li.dataset.desc.includes(val);
                    li.style.display = showTask ? "" : "none";
                    if (showTask) taskCount++;
                });
                noMatchMessage.style.display = (taskCount === 0 && val) ? "block" : "none";
            });
        }
    });

    timeUpdateInterval = setInterval(updateRemainingTimes, 1000);
}

// Update Task Status
function updateTaskStatus(boardIdx, folderIdx, taskIdx, newStatus, liElement) {
    boards[boardIdx].folders[folderIdx].tasks[taskIdx].status = newStatus;
    liElement.className = `task-item ${newStatus.toLowerCase()}`;
    let borderColor;
    switch (newStatus.toLowerCase()) {
        case 'pending': borderColor = 'yellow'; break;
        case 'completed': borderColor = 'green'; break;
        case 'inprocess': borderColor = 'blue'; break;
        case 'terminated': borderColor = 'red'; break;
        default: borderColor = '#6f42c1';
    }
    liElement.style.borderLeftColor = borderColor;
    liElement.querySelector('.task-details p:nth-child(6)').innerText = `Status: ${newStatus}`;
    saveBoardsToLocalStorage(boards);
}

// View Boards Button
document.getElementById("viewBoardsBtn").addEventListener("click", renderBoards);