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