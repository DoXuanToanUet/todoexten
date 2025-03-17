document.addEventListener('DOMContentLoaded', function() {
    const todoInput = document.getElementById('todoInput');
    const todoCategory = document.getElementById('todoCategory');
    const addBtn = document.getElementById('addBtn');
    const todoList = document.getElementById('todoList');
    const tabs = document.querySelectorAll('.tab');
    const paginationContainer = document.getElementById('pagination');
    
    let todos = [];
    let currentFilter = 'all';
    let editingId = null;
    let currentPage = 1;
    const itemsPerPage = 15;
  
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
        currentPage = 1; // Reset to first page when changing tabs
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
          todos[index].lastEditedAt = new Date().toISOString(); // Add last edit time
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
          createdAt: new Date().toISOString(),
          lastEditedAt: null
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
        if (paginationContainer) {
          paginationContainer.innerHTML = '';
        }
        updateTabCounts(); // Cập nhật số lượng cho các tab
        return;
      }
  
      // Pagination
      const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedTodos = filteredTodos.slice(startIndex, endIndex);
  
      paginatedTodos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.classList.add('todo-item');
        if (todo.completed) {
          todoItem.classList.add('completed');
        }
  
        const categoryLabel = getCategoryLabel(todo.category);
        const timeLabel = todo.lastEditedAt ? 
          `Last edit: ${formatDate(new Date(todo.lastEditedAt))}` : 
          `Created: ${formatDate(new Date(todo.createdAt))}`;
        
        todoItem.innerHTML = `
          <div class="content">
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="text">
              ${todo.text}
              <small style="display: block; color: #888; font-size: 0.8em;">
                ${categoryLabel} - ${timeLabel}
              </small>
            </div>
          </div>
          <div class="actions">
            <button class="edit-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
            <button class="delete-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
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
      
      // Render pagination if needed
      if (paginationContainer) {
        renderPagination(totalPages);
      }
      
      // Update the count on tabs
      updateTabCounts();
    }
  
    function renderPagination(totalPages) {
      if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
      }
      
      paginationContainer.innerHTML = '';
      
      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.classList.add('pagination-btn');
      prevBtn.textContent = '←';
      prevBtn.disabled = currentPage === 1;
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderTodos();
        }
      });
      paginationContainer.appendChild(prevBtn);
      
      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.classList.add('pagination-btn');
        if (i === currentPage) {
          pageBtn.classList.add('active');
        }
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
          currentPage = i;
          renderTodos();
        });
        paginationContainer.appendChild(pageBtn);
      }
      
      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.classList.add('pagination-btn');
      nextBtn.textContent = '→';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTodos();
        }
      });
      paginationContainer.appendChild(nextBtn);
    }
  
    function updateTabCounts() {
      const countAll = todos.length;
      const countToday = todos.filter(todo => todo.category === 'today').length;
      const countTomorrow = todos.filter(todo => todo.category === 'tomorrow').length;
      const countWeek = todos.filter(todo => todo.category === 'week').length;
      const countMonth = todos.filter(todo => todo.category === 'month').length;
      
      tabs.forEach(tab => {
        const category = tab.dataset.category;
        if (category === 'all') {
          tab.textContent = `Tất cả (${countAll})`;
        } else if (category === 'today') {
          tab.textContent = `Hôm nay (${countToday})`;
        } else if (category === 'tomorrow') {
          tab.textContent = `Ngày mai (${countTomorrow})`;
        } else if (category === 'week') {
          tab.textContent = `Tuần này (${countWeek})`;
        } else if (category === 'month') {
          tab.textContent = `Tháng này (${countMonth})`;
        }
      });
    }
  
    function getCategoryLabel(category) {
      switch(category) {
        case 'today': return 'Hôm nay';
        case 'tomorrow': return 'Ngày mai';
        case 'week': return 'Tuần này';
        case 'month': return 'Tháng này';
        default: return '';
      }
    }
  
    function formatDate(date) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  });
  