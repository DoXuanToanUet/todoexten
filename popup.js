document.addEventListener('DOMContentLoaded', function () {
  // Thay thế __MSG_key__ bằng thông điệp i18n
  document.body.innerHTML = document.body.innerHTML.replace(/__MSG_([a-zA-Z0-9_]+)__/g, function(match, p1) {
    return chrome.i18n.getMessage(p1);
  });

  // ============================
  // Các biến tham chiếu HTML
  // ============================
  // Header, Theme, Notification
  const timeEl = document.querySelector('.time');
  const dateEl = document.querySelector('.date');
  const darkModeToggle = document.getElementById('toggle-dark-mode');
  const changeThemeIcon = document.getElementById('change-theme');
  const notificationIcon = document.getElementById('notification-icon');
  const notificationBox = document.getElementById('notification-box');
  const notificationList = document.getElementById('notification-list');
  const notifBadge = document.getElementById('notif-badge');
  const notifCountEl = document.getElementById('notif-count');

  // Theme Picker
  const themePicker = document.getElementById('theme-picker');
  const primaryColorPicker = document.getElementById('primaryColorPicker');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const primaryGradientInput = document.getElementById('primaryGradientInput');
  const bgGradientInput = document.getElementById('bgGradientInput');
  const applyThemeBtn = document.getElementById('applyThemeBtn');
  const resetThemeBtn = document.getElementById('resetThemeBtn');

  // New Task
  const openAddTaskBtn = document.getElementById('openAddTask');
  const addTaskGroup = document.getElementById('addTaskGroup');
  const todoTitle = document.getElementById('todoTitle');
  const todoDesc = document.getElementById('todoDesc');
  const todoCategory = document.getElementById('todoCategory');
  const todoDueDate = document.getElementById('todoDueDate');
  const addBtn = document.getElementById('addBtn');
  const taskError = document.getElementById('taskError');

  // Category Management Popup
  const openCategoryManagerBtn = document.getElementById('openCategoryManager');
  const categoryManagementDiv = document.getElementById('category-management');
  const closeCategoryManagerBtn = document.getElementById('closeCategoryManager');
  const categoryListUl = document.getElementById('category-list');
  const newCatInput = document.getElementById('new-cat-input');
  const addCatBtn = document.getElementById('add-cat-btn');
  const categoryOverlay = document.getElementById('category-overlay');

  // Tabs (Filters), Todo List, Pagination
  const tabs = document.querySelectorAll('.tab');
  const todoList = document.getElementById('todoList');
  const paginationContainer = document.getElementById('pagination');

  // Detail View
  const detailView = document.getElementById('detail-view');
  const detailContent = document.getElementById('detail-content');
  const backBtn = document.getElementById('back-btn');

  // Footer (Export)
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const exportBtn = document.getElementById('exportBtn');

  // ============================
  // Global Variables
  // ============================
  let todos = [];
  let editingId = null;
  let currentFilter = 'all';
  let currentPage = 1;
  const itemsPerPage = 10;

  // Các category mặc định (không thể chỉnh sửa, xóa)
  const defaultCategories = ["learning", "shopping", "game"];
  // Các category do người dùng thêm
  let customCategories = [];
  // Biến lưu trữ khi đang sửa custom category (nếu null thì đang thêm mới)
  let editingCategoryIndex = null;

  // ============================
  // Utility Functions
  // ============================
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

  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  function getWeekRange(referenceDate) {
    const day = referenceDate.getDay();
    const diffToMonday = (day === 0 ? 6 : day - 1);
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ============================
  // Theme & Dark Mode
  // ============================
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

  // ============================
  // Notification
  // ============================
  function updateNotifications() {
    notificationList.innerHTML = "";
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingTodos = todos.filter(todo => {
      if (!todo.dueDate) return false;
      return !todo.completed && new Date(todo.dueDate).toISOString().startsWith(todayStr);
    });
    notifBadge.textContent = pendingTodos.length;
    notifCountEl.textContent = pendingTodos.length;
    if (pendingTodos.length === 0) {
      notificationList.innerHTML = `<li>${chrome.i18n.getMessage("noTaskNotification")}</li>`;
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

  // ============================
  // CATEGORY MANAGEMENT
  // ============================
  function loadCustomCategories() {
    chrome.storage.sync.get("customCategories", (data) => {
      if (data.customCategories) {
        customCategories = data.customCategories;
      } else {
        customCategories = [];
      }
      updateCategorySelect();
      updateCategoryList();
    });
  }

  // Cập nhật dropdown category cho New Task
  function updateCategorySelect() {
    todoCategory.innerHTML = "";
    defaultCategories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = capitalize(cat);
      todoCategory.appendChild(option);
    });
    customCategories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      todoCategory.appendChild(option);
    });
  }

  // Cập nhật danh sách hiển thị trong giao diện Category Management
  function updateCategoryList() {
    categoryListUl.innerHTML = "";
    // Hiển thị category mặc định (không thể chỉnh sửa, xóa)
    defaultCategories.forEach(cat => {
      const li = document.createElement("li");
      li.textContent = capitalize(cat) + " (default)";
      categoryListUl.appendChild(li);
    });
    // Hiển thị custom category với các nút Edit và Delete
    customCategories.forEach((cat, index) => {
      const li = document.createElement("li");
      li.dataset.index = index;
      const span = document.createElement("span");
      span.textContent = cat;
      li.appendChild(span);
      // Nút Edit: thay vì prompt, cập nhật vào input và chuyển nút thành Update Category
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        newCatInput.value = cat;
        editingCategoryIndex = index;
        addCatBtn.textContent = "Update Category";
      });
      li.appendChild(editBtn);
      // Nút Delete: xóa luôn không cần hỏi
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        customCategories.splice(index, 1);
        chrome.storage.sync.set({ customCategories });
        updateCategorySelect();
        updateCategoryList();
        // Nếu đang sửa category bị xóa, reset lại form
        if (editingCategoryIndex === index) {
          editingCategoryIndex = null;
          newCatInput.value = "";
          addCatBtn.textContent = "Add Category";
        }
      });
      li.appendChild(delBtn);
      categoryListUl.appendChild(li);
    });
  }

  function existsCategory(catName) {
    const lower = catName.toLowerCase();
    const existsInDefault = defaultCategories.some(c => c.toLowerCase() === lower);
    const existsInCustom = customCategories.some(c => c.toLowerCase() === lower);
    return existsInDefault || existsInCustom;
  }

  // Sự kiện mở/đóng giao diện Category Management Popup (với overlay)
  openCategoryManagerBtn.addEventListener("click", () => {
    categoryManagementDiv.style.display = "block";
    categoryOverlay.style.display = "block";
  });
  closeCategoryManagerBtn.addEventListener("click", () => {
    categoryManagementDiv.style.display = "none";
    categoryOverlay.style.display = "none";
    // Reset form sửa category nếu có
    editingCategoryIndex = null;
    newCatInput.value = "";
    addCatBtn.textContent = "Add Category";
  });

  addCatBtn.addEventListener("click", () => {
    const newCat = newCatInput.value.trim();
    if (newCat === "") return;
    if (existsCategory(newCat)) {
      alert("Category already exists!");
      return;
    }
    if (editingCategoryIndex !== null) {
      // Cập nhật category đang sửa
      customCategories[editingCategoryIndex] = newCat;
      editingCategoryIndex = null;
      addCatBtn.textContent = "Add Category";
    } else {
      customCategories.push(newCat);
    }
    chrome.storage.sync.set({ customCategories });
    updateCategorySelect();
    updateCategoryList();
    newCatInput.value = "";
  });

  loadCustomCategories();

  // ============================
  // TASK MANAGEMENT
  // ============================
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
  function addTodo() {
    const title = todoTitle.value.trim();
    const desc = todoDesc.value.trim();
    const category = todoCategory.value;
    const dueDateValue = todoDueDate.value;
    if (!title || !dueDateValue) {
      taskError.textContent = "Vui lòng nhập tiêu đề và ngày giờ cho task!";
      taskError.style.display = "block";
      return;
    } else {
      taskError.style.display = "none";
    }
    const dueDateISO = new Date(dueDateValue).toISOString();
    if (editingId) {
      const index = todos.findIndex(t => t.id === editingId);
      if (index !== -1) {
        todos[index].title = title;
        todos[index].description = desc;
        todos[index].category = category;
        todos[index].dueDate = dueDateISO;
        todos[index].lastEditedAt = new Date().toISOString();
      }
      editingId = null;
    } else {
      const newTodo = {
        id: Date.now(),
        title,
        description: desc,
        category,
        dueDate: dueDateISO,
        completed: false,
        createdAt: new Date().toISOString(),
        lastEditedAt: null
      };
      todos.unshift(newTodo);
    }
    addTaskGroup.style.display = "none";
    saveTodos();
    renderTodos();
    updateNotifications();
  }
  openAddTaskBtn.addEventListener("click", () => {
    if (addTaskGroup.style.display === "none" || addTaskGroup.style.display === "") {
      addTaskGroup.style.display = "flex";
      todoTitle.value = "";
      todoDesc.value = "";
      todoCategory.value = defaultCategories[0];
      todoDueDate.value = "";
      taskError.style.display = "none";
      todoTitle.focus();
    } else {
      addTaskGroup.style.display = "none";
    }
  });
  addBtn.addEventListener("click", addTodo);
  todoTitle.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTodo();
  });

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.category;
      currentPage = 1;
      renderTodos();
    });
  });

  function renderTodos() {
    let filtered = todos.filter(todo => {
      if (currentFilter === "all") return true;
      if (currentFilter === "completed") return todo.completed;
      if (!todo.dueDate) return false;
      const due = new Date(todo.dueDate);
      const now = new Date();
      if (currentFilter === "today") {
        return isSameDay(now, due);
      } else if (currentFilter === "tomorrow") {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        return isSameDay(tomorrow, due);
      } else if (currentFilter === "this week") {
        const { monday, sunday } = getWeekRange(now);
        return due >= monday && due <= sunday;
      } else if (currentFilter === "planned") {
        const { sunday } = getWeekRange(now);
        return due > sunday;
      }
    });
    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    document.getElementById('allCount').textContent = `(${todos.length})`;
    document.getElementById('todayCount').textContent = `(${todos.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), new Date())).length})`;
    document.getElementById('tomorrowCount').textContent = `(${todos.filter(t => {
      if (!t.dueDate) return false;
      const tomorrow = new Date();
      tomorrow.setDate(new Date().getDate() + 1);
      return isSameDay(new Date(t.dueDate), tomorrow);
    }).length})`;
    document.getElementById('weekCount').textContent = `(${todos.filter(t => {
      if (!t.dueDate) return false;
      const { monday, sunday } = getWeekRange(new Date());
      return new Date(t.dueDate) >= monday && new Date(t.dueDate) <= sunday;
    }).length})`;
    document.getElementById('plannedCount').textContent = `(${todos.filter(t => {
      if (!t.dueDate) return false;
      const { sunday } = getWeekRange(new Date());
      return new Date(t.dueDate) > sunday;
    }).length})`;
    document.getElementById('completedCount').textContent = `(${todos.filter(t => t.completed).length})`;
    const uncompleted = filtered.filter(todo => !todo.completed);
    const completed = filtered.filter(todo => todo.completed);
    todoList.innerHTML = "";
    if (filtered.length === 0) {
      todoList.innerHTML = `<div class="empty-message">No tasks found.</div>`;
      paginationContainer.innerHTML = "";
      return;
    }
    if (currentFilter !== "completed") {
      if (uncompleted.length) {
        const header = document.createElement("div");
        header.className = "section-header";
        header.textContent = "Uncompleted";
        todoList.appendChild(header);
        uncompleted.forEach(renderTodoItem);
      }
      if (completed.length) {
        const header = document.createElement("div");
        header.className = "section-header";
        header.textContent = "Completed";
        todoList.appendChild(header);
        completed.forEach(renderTodoItem);
      }
    } else {
      completed.forEach(renderTodoItem);
    }
    renderPagination(Math.ceil(filtered.length / itemsPerPage));
  }

  function renderTodoItem(todo) {
    const item = document.createElement("div");
    item.classList.add("todo-item");
    if (todo.completed) item.classList.add("completed");
    item.innerHTML = `
      <div class="content">
        <div class="header">
          <span class="task-title">${todo.title}</span>
          <span class="task-meta">${new Date(todo.dueDate).toLocaleString()} | ${todo.category}</span>
        </div>
        <div class="task-desc">${todo.description.length > 100 ? todo.description.substring(0, 100) + "..." : todo.description}</div>
      </div>
      <div class="actions">
        <div class="check-circle ${todo.completed ? "checked" : ""}"></div>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;
    item.querySelector('.content').addEventListener("click", () => {
      showDetail(todo);
    });
    item.querySelector(".check-circle").addEventListener("click", (e) => {
      e.stopPropagation();
      todo.completed = !todo.completed;
      if (todo.completed) {
        todo.lastEditedAt = new Date().toISOString();
      }
      saveTodos();
      renderTodos();
    });
    item.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      editingId = todo.id;
      todoTitle.value = todo.title;
      todoDesc.value = todo.description;
      todoCategory.value = todo.category;
      todoDueDate.value = new Date(todo.dueDate).toISOString().slice(0,16);
      addTaskGroup.style.display = "flex";
      todoTitle.focus();
    });
    item.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      todos = todos.filter(t => t.id !== todo.id);
      saveTodos();
      renderTodos();
    });
    todoList.appendChild(item);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      return;
    }
    paginationContainer.innerHTML = "";
    const prevBtn = document.createElement("button");
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
      pageBtn.textContent = i;
      if (i === currentPage) pageBtn.classList.add("active");
      pageBtn.addEventListener("click", () => {
        currentPage = i;
        renderTodos();
      });
      paginationContainer.appendChild(pageBtn);
    }
    const nextBtn = document.createElement("button");
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

  function showDetail(todo) {
    detailContent.innerHTML = `
      <h2>${todo.title}</h2>
      <p>${todo.description}</p>
      <p><strong>Category:</strong> ${todo.category}</p>
      <p><strong>Due:</strong> ${new Date(todo.dueDate).toLocaleString()}</p>
      <p><strong>Created:</strong> ${new Date(todo.createdAt).toLocaleString()}</p>
      ${todo.lastEditedAt ? `<p><strong>Last Edited:</strong> ${new Date(todo.lastEditedAt).toLocaleString()}</p>` : ''}
    `;
    document.querySelector('.main').style.display = "none";
    detailView.style.display = "flex";
  }
  backBtn.addEventListener("click", () => {
    detailView.style.display = "none";
    document.querySelector('.main').style.display = "block";
  });


  // Các biến tham chiếu cho Settings Popup
const settingsIcon = document.getElementById('settings-icon');
const settingsPopup = document.getElementById('settings-popup');
const settingsClose = document.getElementById('settings-close');
const userNameInput = document.getElementById('userNameInput');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Khi nhấn vào icon settings thì hiện popup
settingsIcon.addEventListener('click', () => {
  settingsPopup.style.display = 'block';
});

// Đóng popup khi nhấn nút close
settingsClose.addEventListener('click', () => {
  settingsPopup.style.display = 'none';
});

// Khi lưu cấu hình
saveSettingsBtn.addEventListener('click', () => {
  const userName = userNameInput.value.trim();

  // Lưu tên người dùng vào storage và cập nhật tiêu đề header
  chrome.storage.sync.set({ userName }, () => {
    const headerTitle = document.querySelector('.title');
    headerTitle.textContent = userName ? `Hi, ${userName}` : chrome.i18n.getMessage("newTask");
  });

  // Lấy trạng thái checkbox của các filter
  const filtersConfig = {
    all: document.getElementById('filter-all').checked,
    today: document.getElementById('filter-today').checked,
    tomorrow: document.getElementById('filter-tomorrow').checked,
    thisWeek: document.getElementById('filter-this-week').checked,
    planned: document.getElementById('filter-planned').checked,
    completed: document.getElementById('filter-completed').checked
  };
  chrome.storage.sync.set({ filtersConfig }, () => {
    // Cập nhật hiển thị các tab filter theo cấu hình
    document.querySelectorAll('.tab').forEach(tab => {
      const category = tab.dataset.category;
      // Đối chiếu key trong filtersConfig với giá trị của data-category
      // (Chú ý: nếu key không khớp, bạn có thể cần ánh xạ lại tên cho phù hợp)
      if (filtersConfig[category] !== undefined ? filtersConfig[category] : true) {
        tab.style.display = 'inline-block';
      } else {
        tab.style.display = 'none';
      }
    });
  });
  // Đóng popup sau khi lưu
  settingsPopup.style.display = 'none';
});

// Khi trang được tải, khởi tạo các giá trị cài đặt đã lưu
chrome.storage.sync.get(['userName', 'filtersConfig'], (data) => {
  if (data.userName) {
    userNameInput.value = data.userName;
    const headerTitle = document.querySelector('.title');
    headerTitle.textContent = `Hi, ${data.userName}`;
  }
  if (data.filtersConfig) {
    document.getElementById('filter-all').checked = data.filtersConfig.all;
    document.getElementById('filter-today').checked = data.filtersConfig.today;
    document.getElementById('filter-tomorrow').checked = data.filtersConfig.tomorrow;
    document.getElementById('filter-this-week').checked = data.filtersConfig.thisWeek;
    document.getElementById('filter-planned').checked = data.filtersConfig.planned;
    document.getElementById('filter-completed').checked = data.filtersConfig.completed;
    // Cập nhật hiển thị các tab filter
    document.querySelectorAll('.tab').forEach(tab => {
      const category = tab.dataset.category;
      if (data.filtersConfig[category] !== undefined ? data.filtersConfig[category] : true) {
        tab.style.display = 'inline-block';
      } else {
        tab.style.display = 'none';
      }
    });
  }
});
// Xử lý chuyển tab trong popup
document.querySelectorAll('.settings-tabs .tab').forEach(tab => {
  tab.addEventListener('click', function () {
    // Xóa active của tất cả tab
    document.querySelectorAll('.settings-tabs .tab').forEach(t => t.classList.remove('active'));
    // Đặt active cho tab được click
    this.classList.add('active');

    // Lấy tên tab từ data attribute
    var tabName = this.dataset.tab;

    // Ẩn tất cả nội dung tab
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    // Hiển thị nội dung tương ứng
    document.getElementById(tabName + '-content').style.display = 'block';
  });
});
// Sự kiện chọn tất cả các filter
document.getElementById('select-all-filters').addEventListener('click', function() {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = true;
  });
});

// Sự kiện bỏ chọn tất cả các filter
document.getElementById('deselect-all-filters').addEventListener('click', function() {
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
});
// Xử lý sự kiện cho nút "Show Demo"
document.getElementById('show-demo-btn').addEventListener('click', function () {
  const demoTasks = [];
  for (let i = 1; i <= 30; i++) {
    // Sinh một ngày ngẫu nhiên trong khoảng từ hôm nay đến 30 ngày sau
    const randomDays = Math.floor(Math.random() * 30);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + randomDays);

    demoTasks.push({
      id: Date.now() + i,  // ID demo (không quá quan trọng, chỉ để demo)
      title: "Demo Task " + i,
      description: "This is a demo description for task " + i,
      category: "demo",
      dueDate: dueDate.toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
      lastEditedAt: null
    });
  }
  // Lưu 50 task demo vào chrome.storage.sync với key "todos"
  chrome.storage.sync.set({ todos: demoTasks }, function () {
    document.getElementById('demo-message').textContent = "50 demo tasks have been added!";
    // Nếu có hàm renderTodos() để cập nhật UI task, bạn có thể gọi ở đây:
    // renderTodos();
  });
});

// Xử lý sự kiện cho nút "Reset Demo"
document.getElementById('reset-demo-btn').addEventListener('click', function () {
  // Thiết lập "todos" về trạng thái ban đầu (ví dụ: mảng rỗng)
  chrome.storage.sync.set({ todos: [] }, function () {
    document.getElementById('demo-message').textContent = "Demo tasks have been reset!";
    // Nếu có hàm renderTodos() để cập nhật UI task, bạn có thể gọi ở đây:
    // renderTodos();
  });
});
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
  // /* --- Export to Word --- */
  // function exportToWord() {
  //   const todayStr = new Date().toISOString().split('T')[0];
  //   let content = '<html><head><meta charset="utf-8"><title>' + chrome.i18n.getMessage("todoListExportTitle") + '</title></head><body>';
  //   content += '<h1>' + chrome.i18n.getMessage("todoListHeader") + '</h1>';
  //   todos.forEach(todo => {
  //     content += `<h2>${todo.title}</h2>`;
  //     content += `<p>${todo.description ? todo.description : ""}</p>`;
  //     content += `<p><em>${chrome.i18n.getMessage("categoryLabel")}: ${chrome.i18n.getMessage(todo.category)} | ${chrome.i18n.getMessage("createdLabel")}: ${formatTime(todo.createdAt)}</em></p>`;
  //     content += `<p><strong>${chrome.i18n.getMessage("statusLabel")}: ${todo.completed ? chrome.i18n.getMessage("completed") : chrome.i18n.getMessage("pending")}</strong></p>`;
  //     if (todo.lastEditedAt) {
  //       content += `<p><em>${chrome.i18n.getMessage("lastEditedLabel")}: ${formatTime(todo.lastEditedAt)}</em></p>`;
  //     }
  //     content += `<hr>`;
  //   });
  //   content += '</body></html>';
  //   const blob = new Blob([content], { type: 'application/msword' });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = `todolist-${todayStr}.doc`;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // }
  // exportBtn.addEventListener('click', exportToWord);
  loadTodos();
});
