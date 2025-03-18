document.addEventListener('DOMContentLoaded', () => {
  // Phần tử header
  const timeEl = document.querySelector('.time');
  const dateEl = document.querySelector('.date');
  const darkModeToggle = document.getElementById('toggle-dark-mode');
  const notificationIcon = document.getElementById('notification-icon');
  const notificationBox = document.getElementById('notification-box');
  const notificationList = document.getElementById('notification-list');
  const notifBadge = document.getElementById('notif-badge');
  const notifCountEl = document.getElementById('notif-count');

  // Phần tử New Task
  const openAddTaskBtn = document.getElementById('openAddTask');
  const addTaskGroup = document.getElementById('addTaskGroup');
  const todoTitle = document.getElementById('todoTitle');
  const todoDesc = document.getElementById('todoDesc');
  const todoCategory = document.getElementById('todoCategory');
  const addBtn = document.getElementById('addBtn');
  const taskError = document.getElementById('taskError');

  // Phần tử liên quan đến todo list và tabs
  const tabs = document.querySelectorAll('.tab');
  const todoList = document.getElementById('todoList');
  const paginationContainer = document.getElementById('pagination');
  const allCount = document.getElementById('allCount');
  const todayCount = document.getElementById('todayCount');
  const tomorrowCount = document.getElementById('tomorrowCount');
  const weekCount = document.getElementById('weekCount');
  const monthCount = document.getElementById('monthCount');

  // Detail View
  const detailView = document.getElementById('detail-view');
  const detailContent = document.getElementById('detail-content');
  const backBtn = document.getElementById('back-btn');

  // Footer Export Buttons
  const exportBtn = document.getElementById('exportBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');

  let todos = [];
  let editingId = null;
  let currentFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 10; // Số task mỗi trang

  /* --- Cập nhật đồng hồ realtime --- */
  function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
    const day = now.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    dateEl.textContent = `${day} ${monthNames[now.getMonth()]}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* --- Dark Mode --- */
  chrome.storage.sync.get('darkMode', (data) => {
    if (data.darkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.textContent = '☀️';
    } else {
      darkModeToggle.textContent = '🌙';
    }
  });
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    chrome.storage.sync.set({ darkMode: isDark });
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  });

  /* --- Notification --- */
  function updateNotifications() {
    notificationList.innerHTML = "";
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingTodos = todos.filter(todo => todo.category === "today" && !todo.completed && todo.createdAt.startsWith(todayStr));
    notifBadge.textContent = pendingTodos.length;
    notifCountEl.textContent = pendingTodos.length;
    if (pendingTodos.length === 0) {
      notificationList.innerHTML = "<li>Không có công việc nào</li>";
    } else {
      pendingTodos.forEach(todo => {
        const li = document.createElement("li");
        li.textContent = todo.title;
        notificationList.appendChild(li);
      });
    }
  }
  
  notificationIcon.addEventListener("click", () => {
    notificationBox.style.display = notificationBox.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!notificationIcon.contains(e.target) && !notificationBox.contains(e.target)) {
      notificationBox.style.display = "none";
    }
  });

  /* --- New Task Interface --- */
  openAddTaskBtn.addEventListener("click", () => {
    if (addTaskGroup.style.display === "none" || addTaskGroup.style.display === "") {
      addTaskGroup.style.display = "flex";
      todoTitle.value = "";
      todoDesc.value = "";
      todoCategory.value = "today";
      taskError.style.display = "none";
      todoTitle.focus();
    } else {
      addTaskGroup.style.display = "none";
    }
  });

  /* --- Sự kiện Thêm Task --- */
  addBtn.addEventListener("click", addTodo);
  todoTitle.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  });

  /* --- Chọn Tab --- */
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.category;
      currentPage = 1;
      renderTodos();
    });
  });

  /* --- Load & Save Todos từ chrome.storage --- */
  function loadTodos() {
    chrome.storage.sync.get("todos", (data) => {
      todos = data.todos || [];
      renderTodos();
      updateNotifications();
    });
  }
  function saveTodos() {
    chrome.storage.sync.set({ todos });
  }

  /* --- Thêm hoặc Cập nhật Todo --- */
  function addTodo() {
    const title = todoTitle.value.trim();
    const desc = todoDesc.value.trim();
    if (!title) {
      taskError.style.display = "block";
      return;
    } else {
      taskError.style.display = "none";
    }

    if (editingId) {
      const index = todos.findIndex((t) => t.id === editingId);
      if (index !== -1) {
        todos[index].title = title;
        todos[index].description = desc;
        todos[index].category = todoCategory.value;
        todos[index].lastEditedAt = new Date().toISOString();
      }
      editingId = null;
    } else {
      const newTodo = {
        id: Date.now(),
        title: title,
        description: desc,
        completed: false,
        category: todoCategory.value,
        createdAt: new Date().toISOString(),
        lastEditedAt: null,
      };
      todos.push(newTodo);
    }
    addTaskGroup.style.display = "none";
    saveTodos();
    renderTodos();
    updateNotifications();
  }

  /* --- Render Todo Item --- */
  function renderTodoItem(todo) {
    const item = document.createElement("div");
    item.classList.add("todo-item");
    if (todo.completed) item.classList.add("completed");

    item.innerHTML = `
      <div class="content">
        <div class="header">
          <span class="task-title">${todo.title}</span>
          <span class="task-meta">${formatTime(todo.createdAt)} | ${todo.category}</span>
        </div>
        <div class="task-desc">${truncate(todo.description) ? truncate(todo.description) : ""}</div>
      </div>
      <div class="actions">
        <div class="check-circle ${todo.completed ? "checked" : ""}"></div>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    const contentDiv = item.querySelector('.content');
    contentDiv.addEventListener("click", () => {
      showDetail(todo);
    });

    const checkCircle = item.querySelector(".check-circle");
    checkCircle.addEventListener("click", (e) => {
      e.stopPropagation();
      todo.completed = !todo.completed;
      if (todo.completed) {
        todo.lastEditedAt = new Date().toISOString();
      }
      saveTodos();
      renderTodos();
      updateNotifications();
    });

    const editBtn = item.querySelector(".edit-btn");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      editingId = todo.id;
      todoTitle.value = todo.title;
      todoDesc.value = todo.description;
      todoCategory.value = todo.category;
      addTaskGroup.style.display = "flex";
      todoTitle.focus();
    });

    const deleteBtn = item.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      todos = todos.filter((t) => t.id !== todo.id);
      saveTodos();
      renderTodos();
      updateNotifications();
    });

    todoList.appendChild(item);
  }

  /* --- Render danh sách Todos với pagination và phân chia theo trạng thái --- */
  function renderTodos() {
    // Lọc todo theo tab hiện tại
    let filtered = todos.filter((todo) => {
      if (currentFilter === "all") return true;
      return todo.category === currentFilter;
    });

    // Cập nhật số lượng trên các tab
    allCount.textContent = `(${todos.length})`;
    todayCount.textContent = `(${todos.filter((t) => t.category === "today").length})`;
    tomorrowCount.textContent = `(${todos.filter((t) => t.category === "tomorrow").length})`;
    weekCount.textContent = `(${todos.filter((t) => t.category === "week").length})`;
    monthCount.textContent = `(${todos.filter((t) => t.category === "month").length})`;

    // Với tab "all", "today" và "tomorrow", sắp xếp theo trạng thái (chưa hoàn thành trước, hoàn thành sau)
    if (currentFilter === "all" || currentFilter === "today" || currentFilter === "tomorrow") {
      filtered.sort((a, b) => a.completed - b.completed);
    }

    // Áp dụng phân trang: tất cả các tab đều hiển thị 10 task mỗi trang
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    todoList.innerHTML = "";
    if (pageItems.length === 0) {
      todoList.innerHTML = '<div class="empty-message">No tasks</div>';
      paginationContainer.innerHTML = "";
      return;
    }

    // Khi ở tab "all", "today", "tomorrow" chèn tiêu đề phân chia nếu có
    if (currentFilter === "all" || currentFilter === "today" || currentFilter === "tomorrow") {
      let renderedSection = { pending: false, completed: false };
      pageItems.forEach(todo => {
        if (!todo.completed && !renderedSection.pending) {
          const header = document.createElement("div");
          header.className = "section-header";
          header.textContent = "Uncompleted";
          todoList.appendChild(header);
          renderedSection.pending = true;
        }
        if (todo.completed && !renderedSection.completed) {
          const header = document.createElement("div");
          header.className = "section-header";
          header.textContent = "Completed";
          todoList.appendChild(header);
          renderedSection.completed = true;
        }
        renderTodoItem(todo);
      });
    } else {
      // Với tab "week", "month" không cần phân chia trạng thái
      pageItems.forEach(renderTodoItem);
    }

    renderPagination(totalPages);
  }

  /* --- Render phân trang --- */
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }
    paginationContainer.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.classList.add("pagination-btn");
    prevBtn.textContent = "←";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTodos();
      }
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.classList.add("pagination-btn");
      if (i === currentPage) {
        pageBtn.classList.add("active");
      }
      pageBtn.textContent = i;
      pageBtn.addEventListener("click", () => {
        currentPage = i;
        renderTodos();
      });
      paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.classList.add("pagination-btn");
    nextBtn.textContent = "→";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTodos();
      }
    });
    paginationContainer.appendChild(nextBtn);
  }

  /* --- Định dạng thời gian hiển thị --- */
  function formatTime(timeStr) {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    return date.toLocaleString();
  }

  /* --- Detail View --- */
  function showDetail(todo) {
    detailContent.innerHTML = `
      <h2>${todo.title}</h2>
      <p>${todo.description ? todo.description : "No description provided."}</p>
      <p><strong>Category:</strong> ${todo.category}</p>
      <p><strong>Created:</strong> ${formatTime(todo.createdAt)}</p>
      ${todo.lastEditedAt ? `<p><strong>Last Edited:</strong> ${formatTime(todo.lastEditedAt)}</p>` : ''}
    `;
    document.querySelector('.main').style.display = 'none';
    detailView.style.display = 'block';
  }
  backBtn.addEventListener('click', () => {
    detailView.style.display = 'none';
    document.querySelector('.main').style.display = 'block';
  });

  /* --- Export to Word --- */
  function exportToWord() {
    const todayStr = new Date().toISOString().split('T')[0];
    let content = '<html><head><meta charset="utf-8"><title>Todo List Export</title></head><body>';
    content += '<h1>Todo List</h1>';
    todos.forEach(todo => {
      content += `<h2>${todo.title}</h2>`;
      content += `<p>${todo.description ? todo.description : ""}</p>`;
      content += `<p><em>Category: ${todo.category} | Created: ${todo.createdAt}</em></p>`;
      content += `<p><strong>Status: ${todo.completed ? "Completed" : "Pending"}</strong></p>`;
      if (todo.lastEditedAt) {
        content += `<p><em>Last Edited: ${todo.lastEditedAt}</em></p>`;
      }
      content += `<hr>`;
    });
    content += '</body></html>';
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todolist-${todayStr}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  exportBtn.addEventListener('click', exportToWord);
  function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }
  /* --- Export to Excel (CSV) --- */
  function exportToExcel() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Title,Description,Category,Created,Status,Last Edited\n";
    todos.forEach(todo => {
      const row = [
        `"${todo.title.replace(/"/g, '""')}"`,
        `"${(todo.description || "").replace(/"/g, '""')}"`,
        todo.category,
        todo.createdAt,
        todo.completed ? "Completed" : "Pending",
        todo.lastEditedAt || ""
      ].join(",");
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const todayStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `todolist-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  exportExcelBtn.addEventListener('click', exportToExcel);

  loadTodos();
});
