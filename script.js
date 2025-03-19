document.addEventListener('DOMContentLoaded', function() {
    const todoInput = document.getElementById('todoInput');
    const todoCategory = document.getElementById('todoCategory');
    const addBtn = document.getElementById('addBtn');
    const todoList = document.getElementById('todoList');
    const tabs = document.querySelectorAll('.tab');
    
    let todos = [];
    let currentFilter = 'all';
    let editingId = null;
  
    // Load todos from Chrome storage
    loadTodos();
  
    // Add event listeners
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addTodo();
      }
    });
  
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.category;
        renderTodos();
      });
    });
  
    function loadTodos() {
      chrome.storage.sync.get('todos', function(data) {
        if (data.todos) {
          todos = data.todos;
          renderTodos();
        }
      });
    }
  
    function saveTodos() {
      chrome.storage.sync.set({ 'todos': todos });
    }
  
    function addTodo() {
      const text = todoInput.value.trim();
      if (text === '') return;
  
      if (editingId !== null) {
        // Update existing todo
        const index = todos.findIndex(todo => todo.id === editingId);
        if (index !== -1) {
          todos[index].text = text;
          todos[index].category = todoCategory.value;
          editingId = null;
          addBtn.textContent = 'Thêm';
        }
      } else {
        // Add new todo
        const newTodo = {
          id: Date.now(),
          text: text,
          completed: false,
          category: todoCategory.value,
          createdAt: new Date().toISOString()
        };
        todos.push(newTodo);
      }
  
      todoInput.value = '';
      saveTodos();
      renderTodos();
    }
  
    function deleteTodo(id) {
      todos = todos.filter(todo => todo.id !== id);
      saveTodos();
      renderTodos();
    }
  
    function toggleTodo(id) {
      const todo = todos.find(todo => todo.id === id);
      if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
      }
    }
  
    function editTodo(id) {
      const todo = todos.find(todo => todo.id === id);
      if (todo) {
        todoInput.value = todo.text;
        todoCategory.value = todo.category;
        todoInput.focus();
        editingId = id;
        addBtn.textContent = 'Cập nhật';
      }
    }
  
    function renderTodos() {
      todoList.innerHTML = '';
      
      const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'all') return true;
        return todo.category === currentFilter;
      });
  
      if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div class="empty-message">Không có công việc nào</div>';
        return;
      }
  
      filteredTodos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.classList.add('todo-item');
        if (todo.completed) {
          todoItem.classList.add('completed');
        }
  
        const categoryLabel = getCategoryLabel(todo.category);
        
        todoItem.innerHTML = `
          <div class="content">
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="text">
              ${todo.text}
              <small style="display: block; color: #888; font-size: 0.8em;">${categoryLabel}</small>
            </div>
          </div>
          <div class="actions">
            <button class="edit-btn">✏️</button>
            <button class="delete-btn">🗑️</button>
          </div>
        `;
  
        const checkbox = todoItem.querySelector('input[type="checkbox"]');
        const editBtn = todoItem.querySelector('.edit-btn');
        const deleteBtn = todoItem.querySelector('.delete-btn');
  
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        editBtn.addEventListener('click', () => editTodo(todo.id));
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
  
        todoList.appendChild(todoItem);
      });
    }
  
    function getCategoryLabel(category) {
      switch(category) {
        case 'today': return 'Hôm nay';
        case 'week': return 'Tuần này';
        case 'month': return 'Tháng này';
        default: return '';
      }
    }
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