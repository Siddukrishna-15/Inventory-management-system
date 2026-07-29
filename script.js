const API_URL = 'http://localhost:5000/api/items';
const ANALYTICS_URL = 'http://localhost:5000/api/analytics';
let items = [];
let editingId = null;
let categoryChartInstance = null;
let stockChartInstance = null;

// Redirect to login if no token
const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

document.getElementById('welcomeUser').textContent = `👋 Hi, ${localStorage.getItem('username') || 'User'}`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
}

async function fetchItems() {
  const res = await fetch(API_URL, { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  items = await res.json();
  renderItems();
  renderStats();
  renderCharts();
}

function renderStats() {
  const totalItems = items.length;
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const lowStock = items.filter(i => i.quantity < 10).length;

  document.getElementById('statTotalItems').textContent = totalItems;
  document.getElementById('statTotalQty').textContent = totalQty;
  document.getElementById('statTotalValue').textContent = '₹' + totalValue.toLocaleString('en-IN');
  document.getElementById('statLowStock').textContent = lowStock;
}

async function renderCharts() {
  const res = await fetch(ANALYTICS_URL, { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  const data = await res.json();

  const catLabels = Object.keys(data.categoryDistribution);
  const catValues = Object.values(data.categoryDistribution);

  const ctx1 = document.getElementById('categoryChart');
  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: catLabels.length ? catLabels : ['No data'],
      datasets: [{
        data: catValues.length ? catValues : [1],
        backgroundColor: ['#667eea', '#ff6a88', '#43e97b', '#fee140', '#4facfe', '#a18cd1', '#fa709a']
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });

  const ctx2 = document.getElementById('stockChart');
  if (stockChartInstance) stockChartInstance.destroy();
  stockChartInstance = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: data.stockLevels.map(i => i.name),
      datasets: [{
        label: 'Quantity',
        data: data.stockLevels.map(i => i.quantity),
        backgroundColor: '#764ba2',
        borderRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderItems() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const tbody = document.getElementById('itemsTableBody');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search) || i.category.toLowerCase().includes(search)
  );

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(item => {
    const isLow = item.quantity < 10;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.quantity}</td>
      <td>₹${item.price}</td>
      <td>₹${(item.quantity * item.price).toLocaleString('en-IN')}</td>
      <td><span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">${isLow ? 'Low Stock' : 'In Stock'}</span></td>
      <td>
        <button class="action-btn edit-btn" onclick="editItem(${item.id})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteItem(${item.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Item';
  document.getElementById('itemName').value = '';
  document.getElementById('itemCategory').value = '';
  document.getElementById('itemQuantity').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemCategory').value = item.category;
  document.getElementById('itemQuantity').value = item.quantity;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('modalOverlay').classList.add('active');
}

async function saveItem() {
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value.trim();
  const quantity = document.getElementById('itemQuantity').value;
  const price = document.getElementById('itemPrice').value;

  if (!name || !category || !quantity || !price) {
    showToast('⚠️ Please fill all fields');
    return;
  }

  const payload = { name, category, quantity, price };

  if (editingId) {
    await fetch(`${API_URL}/${editingId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    showToast('✅ Item updated');
  } else {
    await fetch(API_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    showToast('✅ Item added');
  }

  closeModal();
  fetchItems();
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: authHeaders() });
  showToast('🗑️ Item deleted');
  fetchItems();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

fetchItems();