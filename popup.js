document.addEventListener('DOMContentLoaded', function() {
  // Tìm tất cả các token __MSG_key__ trong nội dung HTML và thay thế
  document.body.innerHTML = document.body.innerHTML.replace(/__MSG_([a-zA-Z0-9_]+)__/g, function(match, p1) {
    return chrome.i18n.getMessage(p1);
  });

  // Các đoạn code khác cho extension (ví dụ: xử lý sự kiện click, dark mode, vv)
});

document.addEventListener('DOMContentLoaded', () => {
  // Phần tử header
  const timeEl = document.querySelector('.time');
  const dateEl = document.querySelector('.date');
  const darkModeToggle = document.getElementById('toggle-dark-mode');
  const changeThemeIcon = document.getElementById('change-theme');
  const notificationIcon = document.getElementById('notification-icon');
  const notificationBox = document.getElementById('notification-box');
  const notificationList = document.getElementById('notification-list');
  const notifBadge = document.getElementById('notif-badge');
  const notifCountEl = document.getElementById('notif-count');

  // Phần tử Theme Picker
  const themePicker = document.getElementById('theme-picker');
  const primaryColorPicker = document.getElementById('primaryColorPicker');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const primaryGradientInput = document.getElementById('primaryGradientInput');
  const bgGradientInput = document.getElementById('bgGradientInput');
  const applyThemeBtn = document.getElementById('applyThemeBtn');
  const resetThemeBtn = document.getElementById('resetThemeBtn');

  // Swatch gợi ý
  document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      primaryGradientInput.value = swatch.getAttribute('data-gradient');
    });
  });

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

  /* --- Load theme colors từ chrome.storage --- */
  chrome.storage.sync.get(['primaryColor', 'bgColor'], (data) => {
    if (data.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', data.primaryColor);
      primaryColorPicker.value = data.primaryColor.startsWith("linear-gradient") ? "#3a66f7" : data.primaryColor;
    }
    if (data.bgColor) {
      document.documentElement.style.setProperty('--background-color', data.bgColor);
      bgColorPicker.value = data.bgColor.startsWith("linear-gradient") ? "#f8f9fb" : data.bgColor;
    }
  });

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

  /* --- Change Theme --- */
  changeThemeIcon.addEventListener('click', () => {
    themePicker.style.display = themePicker.style.display === 'block' ? 'none' : 'block';
  });
  applyThemeBtn.addEventListener('click', () => {
    let primaryValue = primaryColorPicker.value;
    let bgValue = bgColorPicker.value;
    if (primaryGradientInput.value.trim() !== "") {
      primaryValue = primaryGradientInput.value.trim();
    }
    if (bgGradientInput.value.trim() !== "") {
      bgValue = bgGradientInput.value.trim();
    }
    document.documentElement.style.setProperty('--primary-color', primaryValue);
    document.documentElement.style.setProperty('--background-color', bgValue);
    chrome.storage.sync.set({ primaryColor: primaryValue, bgColor: bgValue });
    themePicker.style.display = 'none';
  });
  resetThemeBtn.addEventListener('click', () => {
    const defaultPrimary = "#3a66f7";
    const defaultBg = "#f8f9fb";
    primaryColorPicker.value = defaultPrimary;
    bgColorPicker.value = defaultBg;
    primaryGradientInput.value = "";
    bgGradientInput.value = "";
    document.documentElement.style.setProperty('--primary-color', defaultPrimary);
    document.documentElement.style.setProperty('--background-color', defaultBg);
    chrome.storage.sync.set({ primaryColor: defaultPrimary, bgColor: defaultBg });
  });

  /* --- Notification --- */
  function updateNotifications() {
    notificationList.innerHTML = "";
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingTodos = todos.filter(todo => todo.category === "today" && !todo.completed && todo.createdAt.startsWith(todayStr));
    notifBadge.textContent = pendingTodos.length;
    notifCountEl.textContent = pendingTodos.length;
    if (pendingTodos.length === 0) {
      notificationList.innerHTML = "<li>" + chrome.i18n.getMessage("noTaskNotification") + "</li>";
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
      // Thêm mới vào đầu mảng
      todos.unshift(newTodo);
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

    // Sử dụng các chuỗi đa ngôn ngữ cho nút Edit & Delete
    item.innerHTML = `
      <div class="content">
        <div class="header">
          <span class="task-title">${todo.title}</span>
          <span class="task-meta">${formatTime(todo.createdAt)} | ${chrome.i18n.getMessage(todo.category)}</span>
        </div>
        <div class="task-desc">${truncate(todo.description, 100)}</div>
      </div>
      <div class="actions">
        <div class="check-circle ${todo.completed ? "checked" : ""}"></div>
        <button class="edit-btn">${chrome.i18n.getMessage("edit")}</button>
        <button class="delete-btn">${chrome.i18n.getMessage("delete")}</button>
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

  /* --- Render danh sách Todos với phân trang và phân chia theo trạng thái --- */
  function renderTodos() {
    let filtered = todos.filter((todo) => {
      if (currentFilter === "all") return true;
      return todo.category === currentFilter;
    });

    allCount.textContent = `(${todos.length})`;
    todayCount.textContent = `(${todos.filter((t) => t.category === "today").length})`;
    tomorrowCount.textContent = `(${todos.filter((t) => t.category === "tomorrow").length})`;
    weekCount.textContent = `(${todos.filter((t) => t.category === "week").length})`;
    monthCount.textContent = `(${todos.filter((t) => t.category === "month").length})`;

    if (currentFilter === "all" || currentFilter === "today" || currentFilter === "tomorrow") {
      const pending = filtered.filter(todo => !todo.completed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const completedTodos = filtered.filter(todo => todo.completed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      filtered = [...pending, ...completedTodos];
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

    todoList.innerHTML = "";
    if (pageItems.length === 0) {
      todoList.innerHTML = '<div class="empty-message">' + chrome.i18n.getMessage("noTasks") + '</div>';
      paginationContainer.innerHTML = "";
      return;
    }

    if (currentFilter === "all" || currentFilter === "today" || currentFilter === "tomorrow") {
      let renderedSection = { pending: false, completed: false };
      pageItems.forEach(todo => {
        if (!todo.completed && !renderedSection.pending) {
          const header = document.createElement("div");
          header.className = "section-header";
          header.textContent = chrome.i18n.getMessage("uncompleted");
          todoList.appendChild(header);
          renderedSection.pending = true;
        }
        if (todo.completed && !renderedSection.completed) {
          const header = document.createElement("div");
          header.className = "section-header";
          header.textContent = chrome.i18n.getMessage("completed");
          todoList.appendChild(header);
          renderedSection.completed = true;
        }
        renderTodoItem(todo);
      });
    } else {
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

  /* --- Hàm cắt chuỗi mô tả --- */
  function truncate(text, maxLength) {
    return text && text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }

  /* --- Detail View --- */
  function showDetail(todo) {
    detailContent.innerHTML = `
      <h2>${todo.title}</h2>
      <p>${todo.description ? todo.description : chrome.i18n.getMessage("noDescription")}</p>
      <p><strong>${chrome.i18n.getMessage("categoryLabel")}:</strong> ${chrome.i18n.getMessage(todo.category)}</p>
      <p><strong>${chrome.i18n.getMessage("createdLabel")}:</strong> ${formatTime(todo.createdAt)}</p>
      ${todo.lastEditedAt ? `<p><strong>${chrome.i18n.getMessage("lastEditedLabel")}:</strong> ${formatTime(todo.lastEditedAt)}</p>` : ''}
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
    let content = '<html><head><meta charset="utf-8"><title>' + chrome.i18n.getMessage("todoListExportTitle") + '</title></head><body>';
    content += '<h1>' + chrome.i18n.getMessage("todoListHeader") + '</h1>';
    todos.forEach(todo => {
      content += `<h2>${todo.title}</h2>`;
      content += `<p>${todo.description ? todo.description : ""}</p>`;
      content += `<p><em>${chrome.i18n.getMessage("categoryLabel")}: ${chrome.i18n.getMessage(todo.category)} | ${chrome.i18n.getMessage("createdLabel")}: ${formatTime(todo.createdAt)}</em></p>`;
      content += `<p><strong>${chrome.i18n.getMessage("statusLabel")}: ${todo.completed ? chrome.i18n.getMessage("completed") : chrome.i18n.getMessage("pending")}</strong></p>`;
      if (todo.lastEditedAt) {
        content += `<p><em>${chrome.i18n.getMessage("lastEditedLabel")}: ${formatTime(todo.lastEditedAt)}</em></p>`;
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

  /* --- Export to Excel (CSV) --- */
  function exportToExcel() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `${chrome.i18n.getMessage("titleLabel")},${chrome.i18n.getMessage("descriptionLabel")},${chrome.i18n.getMessage("categoryLabel")},${chrome.i18n.getMessage("createdLabel")},${chrome.i18n.getMessage("statusLabel")},${chrome.i18n.getMessage("lastEditedLabel")}\n`;
    todos.forEach(todo => {
      const row = [
        `"${todo.title.replace(/"/g, '""')}"`,
        `"${(todo.description || "").replace(/"/g, '""')}"`,
        chrome.i18n.getMessage(todo.category),
        todo.createdAt,
        todo.completed ? chrome.i18n.getMessage("completed") : chrome.i18n.getMessage("pending"),
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


   // --- Search Popup Functionality ---
   const searchIcon = document.getElementById('search-icon');
   const searchPopup = document.getElementById('search-popup');
   const searchClose = document.getElementById('search-close');
   const searchInput = document.getElementById('search-input');
   const searchResults = document.getElementById('search-results');
   const searchTabs = document.querySelectorAll('.search-tab');
 
   let currentSearchFilter = 'all';
 
   // Mở search popup khi nhấn vào icon search
   searchIcon.addEventListener('click', () => {
     searchPopup.style.display = 'flex';
     searchInput.focus();
   });
 
   // Đóng search popup khi click nút đóng
   searchClose.addEventListener('click', () => {
     searchPopup.style.display = 'none';
     searchInput.value = '';
     searchResults.innerHTML = '';
     resetSearchTabs(); // Khôi phục nội dung ban đầu cho các tab
   });
 
   // Đóng search popup khi click bên ngoài khối nội dung
   searchPopup.addEventListener('click', function(event) {
     if (event.target === searchPopup) {
       searchPopup.style.display = 'none';
       searchInput.value = '';
       searchResults.innerHTML = '';
       resetSearchTabs();
     }
   });
 
   // Xử lý chuyển tab trong search popup
   searchTabs.forEach(tab => {
     tab.addEventListener('click', () => {
       searchTabs.forEach(t => t.classList.remove('active'));
       tab.classList.add('active');
       currentSearchFilter = tab.getAttribute('data-filter');
       performSearch();
     });
   });
 
   // Hàm khôi phục nội dung ban đầu cho các tab (với chỉ số = 0)
   function resetSearchTabs() {
     document.querySelector('.search-tab[data-filter="all"]').innerHTML = chrome.i18n.getMessage("all") + "(0)";
     document.querySelector('.search-tab[data-filter="today"]').innerHTML = chrome.i18n.getMessage("today") + "(0)";
     document.querySelector('.search-tab[data-filter="week"]').innerHTML = chrome.i18n.getMessage("thisWeek") + "(0)";
     document.querySelector('.search-tab[data-filter="month"]').innerHTML = chrome.i18n.getMessage("thisMonth") + "(0)";
   }
 
   // Hàm thực hiện tìm kiếm và cập nhật badge cho các tab
   function performSearch() {
     const query = searchInput.value.trim().toLowerCase();
     if (!query) {
       searchResults.innerHTML = '';
       resetSearchTabs();
       return;
     }
     // Lọc tất cả task theo query (title hoặc description)
     const allResults = todos.filter(todo => {
       return todo.title.toLowerCase().includes(query) ||
              (todo.description && todo.description.toLowerCase().includes(query));
     });
     // Lọc theo từng category
     const resultsAll = allResults;
     const resultsToday = allResults.filter(todo => todo.category === 'today');
     const resultsWeek = allResults.filter(todo => todo.category === 'week');
     const resultsMonth = allResults.filter(todo => todo.category === 'month');
 
     // Cập nhật badge cho các tab
     document.querySelector('.search-tab[data-filter="all"]').innerHTML = chrome.i18n.getMessage("all") + `(${resultsAll.length})`;
     document.querySelector('.search-tab[data-filter="today"]').innerHTML = chrome.i18n.getMessage("today") + `(${resultsToday.length})`;
     document.querySelector('.search-tab[data-filter="week"]').innerHTML = chrome.i18n.getMessage("thisWeek") + `(${resultsWeek.length})`;
     document.querySelector('.search-tab[data-filter="month"]').innerHTML = chrome.i18n.getMessage("thisMonth") + `(${resultsMonth.length})`;
 
     // Chọn kết quả hiển thị theo tab được chọn
     let filtered = [];
     if (currentSearchFilter === 'all') {
       filtered = resultsAll;
     } else if (currentSearchFilter === 'today') {
       filtered = resultsToday;
     } else if (currentSearchFilter === 'week') {
       filtered = resultsWeek;
     } else if (currentSearchFilter === 'month') {
       filtered = resultsMonth;
     }
 
     // Hiển thị kết quả
     let resultsCountHTML = `<div class="search-results-count">${filtered.length} ${chrome.i18n.getMessage("resultsFound")}</div>`;
     searchResults.innerHTML = '';
     if (filtered.length === 0) {
       searchResults.innerHTML = `<div class="search-no-result">${chrome.i18n.getMessage("noTasksFound")}</div>`;
     } else {
       searchResults.innerHTML = resultsCountHTML;
       filtered.forEach(todo => {
         const item = document.createElement('div');
         item.classList.add('search-result-item');
         item.textContent = todo.title;
         // Khi click vào kết quả, mở chi tiết task và ẩn popup
         item.addEventListener('click', () => {
           showDetail(todo);
           searchPopup.style.display = 'none';
           searchInput.value = '';
           searchResults.innerHTML = '';
           resetSearchTabs();
         });
         searchResults.appendChild(item);
       });
     }
   }
 
   // Lắng nghe sự kiện nhập liệu để thực hiện tìm kiếm
   searchInput.addEventListener('input', performSearch);
  loadTodos();
});
