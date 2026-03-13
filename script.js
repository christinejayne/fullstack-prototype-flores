"use strict";

/* ══════════════════════════════════════════════════
   PHASE 4: STORAGE
══════════════════════════════════════════════════ */

const STORAGE_KEY = 'ipt_demo_v1';

window.db = {
  accounts:    [],
  departments: [],
  employees:   [],
  requests:    [],
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      window.db = { ...window.db, ...JSON.parse(raw) };
    } else {
      seedData();
    }
  } catch (e) {
    seedData();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function seedData() {
  window.db.accounts = [{
    id: 'acc_1',
    firstName: 'Admin',
    lastName:  'User',
    email:     'admin@example.com',
    password:  'Password123!',
    role:      'admin',
    verified:  true,
  }];
  window.db.departments = [
    { id: 'dept_1', name: 'Engineering', description: 'Software and hardware engineers' },
    { id: 'dept_2', name: 'HR',          description: 'Human Resources department' },
  ];
  window.db.employees = [];
  window.db.requests  = [];
  saveToStorage();
}


/* ══════════════════════════════════════════════════
   PHASE 2: ROUTING
══════════════════════════════════════════════════ */

let currentUser = null;

const PROTECTED  = ['#/profile', '#/requests'];
const ADMIN_ONLY = ['#/employees', '#/accounts', '#/departments'];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  const hash = window.location.hash || '#/';

  if (!currentUser && (PROTECTED.includes(hash) || ADMIN_ONLY.includes(hash))) {
    showToast('Please log in first.', 'warning');
    navigateTo('#/login');
    return;
  }

  if (currentUser && currentUser.role !== 'admin' && ADMIN_ONLY.includes(hash)) {
    showToast('Admins only.', 'error');
    navigateTo('#/');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  switch (hash) {
    case '#/':
    case '#/home':         show('home-page');        break;
    case '#/register':     show('register-page');    break;
    case '#/verify-email':
      show('verify-email-page');
      renderVerifyPage();
      break;
    case '#/login':        show('login-page');       break;
    case '#/profile':
      show('profile-page');
      renderProfile();
      break;
    case '#/employees':
      show('employees-page');
      renderEmployeesTable();
      break;
    case '#/departments':
      show('departments-page');
      renderDepartmentsList();
      break;
    case '#/accounts':
      show('accounts-page');
      renderAccountsList();
      break;
    case '#/requests':
      show('requests-page');
      renderRequestsList();
      break;
    default:
      show('home-page');
  }
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

window.addEventListener('hashchange', handleRouting);


/* ══════════════════════════════════════════════════
   PHASE 3: AUTH
══════════════════════════════════════════════════ */

function setAuthState(isAuth, user = null) {
  currentUser = user;
  const body  = document.body;

  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    body.classList.toggle('is-admin', user.role === 'admin');
    const el = document.getElementById('nav-username');
    if (el) el.textContent = user.firstName + ' ' + user.lastName;
  } else {
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
    currentUser = null;
  }
}

// A. REGISTER
document.getElementById('register-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim().toLowerCase();
  const password  = document.getElementById('reg-password').value;
  const errEl     = document.getElementById('register-error');

  if (!firstName || !lastName || !email || !password)
    return showErr(errEl, 'All fields are required.');
  if (password.length < 6)
    return showErr(errEl, 'Password must be at least 6 characters.');
  if (window.db.accounts.find(a => a.email === email))
    return showErr(errEl, 'Email already registered.');

  window.db.accounts.push({
    id: 'acc_' + Date.now(),
    firstName, lastName, email, password,
    role: 'user', verified: false,
  });
  saveToStorage();
  localStorage.setItem('unverified_email', email);

  errEl.classList.add('d-none');
  this.reset();
  showToast('Account created! Please verify your email.', 'success');
  navigateTo('#/verify-email');
});

// B. VERIFY EMAIL
function renderVerifyPage() {
  const email = localStorage.getItem('unverified_email') || '—';
  document.getElementById('verify-email-display').textContent = email;
}

document.getElementById('simulate-verify-btn').addEventListener('click', function () {
  const email = localStorage.getItem('unverified_email');
  if (!email) { showToast('No pending verification.', 'error'); return; }

  const acc = window.db.accounts.find(a => a.email === email);
  if (!acc)  { showToast('Account not found.', 'error'); return; }

  acc.verified = true;
  saveToStorage();
  localStorage.removeItem('unverified_email');
  showToast('Email verified! You can now login.', 'success');
  navigateTo('#/login');
});

// C. LOGIN
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  const user = window.db.accounts.find(
    a => a.email === email && a.password === password && a.verified === true
  );

  if (!user) return showErr(errEl, 'Invalid credentials, or account not verified.');

  localStorage.setItem('auth_token', email);
  setAuthState(true, user);
  errEl.classList.add('d-none');
  this.reset();
  showToast('Welcome back, ' + user.firstName + '!', 'success');
  navigateTo('#/profile');
});

// E. LOGOUT
document.getElementById('logout-btn').addEventListener('click', function (e) {
  e.preventDefault();
  localStorage.removeItem('auth_token');
  setAuthState(false);
  showToast('Logged out.', 'info');
  navigateTo('#/');
});

// Restore session on refresh
function restoreSession() {
  const token = localStorage.getItem('auth_token');
  if (!token) return;
  const user = window.db.accounts.find(a => a.email === token);
  if (user) setAuthState(true, user);
  else      localStorage.removeItem('auth_token');
}


/* ══════════════════════════════════════════════════
   PHASE 5: PROFILE
══════════════════════════════════════════════════ */

function renderProfile() {
  if (!currentUser) return;
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-card">
      <div class="profile-name">${currentUser.firstName} ${currentUser.lastName}</div>
      <div class="profile-row text-muted">Email: ${currentUser.email}</div>
      <div class="profile-row"><strong>Role:</strong> ${capitalize(currentUser.role)}</div>
      <div class="mt-3">
        <button class="btn btn-outline-secondary btn-sm"
                onclick="alert('Edit Profile — coming soon!')">
          Edit Profile
        </button>
      </div>
    </div>
  `;
}


/* ══════════════════════════════════════════════════
   PHASE 6A: ACCOUNTS CRUD
══════════════════════════════════════════════════ */

function renderAccountsList() {
  const el = document.getElementById('accounts-content');
  if (!window.db.accounts.length) {
    el.innerHTML = emptyState('No accounts yet.');
    return;
  }
  el.innerHTML = `
    <table class="table table-bordered table-hover table-sm">
      <thead class="table-light">
        <tr>
          <th>Name</th><th>Email</th><th>Role</th>
          <th>Verified</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${window.db.accounts.map(a => `
          <tr>
            <td>${a.firstName} ${a.lastName}</td>
            <td>${a.email}</td>
            <td>
              <span class="badge ${a.role === 'admin' ? 'bg-dark' : 'bg-secondary'}">
                ${a.role}
              </span>
            </td>
            <td>${a.verified
              ? '<span class="badge bg-success">✓ Yes</span>'
              : '<span class="badge bg-danger">✗ No</span>'
            }</td>
            <td>
              <button class="btn btn-outline-primary btn-sm me-1"
                      onclick="openEditAccount('${a.id}')">Edit</button>
              <button class="btn btn-outline-secondary btn-sm me-1"
                      onclick="resetPassword('${a.id}')">Reset PW</button>
              <button class="btn btn-outline-danger btn-sm"
                      onclick="deleteAccount('${a.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('add-account-btn').addEventListener('click', () => {
  document.getElementById('accountModalTitle').textContent = 'Add Account';
  document.getElementById('account-form').reset();
  document.getElementById('account-edit-id').value = '';
  document.getElementById('account-form-error').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('accountModal')).show();
});

window.openEditAccount = function (id) {
  const a = window.db.accounts.find(x => x.id === id);
  if (!a) return;
  document.getElementById('accountModalTitle').textContent = 'Edit Account';
  document.getElementById('account-edit-id').value = a.id;
  document.getElementById('acc-firstname').value   = a.firstName;
  document.getElementById('acc-lastname').value    = a.lastName;
  document.getElementById('acc-email').value       = a.email;
  document.getElementById('acc-password').value    = '';
  document.getElementById('acc-role').value        = a.role;
  document.getElementById('acc-verified').checked  = a.verified;
  document.getElementById('account-form-error').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('accountModal')).show();
};

document.getElementById('account-save-btn').addEventListener('click', () => {
  const editId    = document.getElementById('account-edit-id').value;
  const firstName = document.getElementById('acc-firstname').value.trim();
  const lastName  = document.getElementById('acc-lastname').value.trim();
  const email     = document.getElementById('acc-email').value.trim().toLowerCase();
  const password  = document.getElementById('acc-password').value;
  const role      = document.getElementById('acc-role').value;
  const verified  = document.getElementById('acc-verified').checked;
  const errEl     = document.getElementById('account-form-error');

  if (!firstName || !lastName || !email)
    return showErr(errEl, 'Name and email are required.');
  if (!editId && password.length < 6)
    return showErr(errEl, 'Password must be at least 6 characters.');
  if (window.db.accounts.find(a => a.email === email && a.id !== editId))
    return showErr(errEl, 'Email already in use.');

  if (editId) {
    const a = window.db.accounts.find(x => x.id === editId);
    if (a) {
      Object.assign(a, { firstName, lastName, email, role, verified });
      if (password.length >= 6) a.password = password;
    }
    showToast('Account updated.', 'success');
  } else {
    window.db.accounts.push({
      id: 'acc_' + Date.now(),
      firstName, lastName, email, password, role, verified,
    });
    showToast('Account created.', 'success');
  }

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
  renderAccountsList();
});

window.resetPassword = function (id) {
  const pw = prompt('New password (min 6 chars):');
  if (!pw) return;
  if (pw.length < 6) { showToast('Too short (min 6).', 'error'); return; }
  const a = window.db.accounts.find(x => x.id === id);
  if (a) { a.password = pw; saveToStorage(); showToast('Password reset.', 'success'); }
};

window.deleteAccount = function (id) {
  if (currentUser && currentUser.id === id) {
    showToast('Cannot delete your own account.', 'error'); return;
  }
  if (!confirm('Delete this account?')) return;
  window.db.accounts = window.db.accounts.filter(a => a.id !== id);
  saveToStorage();
  showToast('Account deleted.', 'success');
  renderAccountsList();
};


/* ══════════════════════════════════════════════════
   PHASE 6B: DEPARTMENTS CRUD
══════════════════════════════════════════════════ */

function renderDepartmentsList() {
  const el = document.getElementById('departments-content');
  if (!window.db.departments.length) {
    el.innerHTML = emptyState('No departments yet.');
    return;
  }
  el.innerHTML = `
    <table class="table table-bordered table-hover table-sm">
      <thead class="table-light">
        <tr><th>Name</th><th>Description</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${window.db.departments.map(d => `
          <tr>
            <td>${d.name}</td>
            <td>${d.description || '—'}</td>
            <td>
              <button class="btn btn-outline-danger btn-sm"
                      onclick="deleteDept('${d.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('add-dept-btn').addEventListener('click', () => {
  document.getElementById('dept-form').reset();
  new bootstrap.Modal(document.getElementById('deptModal')).show();
});

document.getElementById('dept-save-btn').addEventListener('click', () => {
  const name = document.getElementById('dept-name').value.trim();
  const desc = document.getElementById('dept-desc').value.trim();
  if (!name) { showToast('Name is required.', 'error'); return; }
  window.db.departments.push({ id: 'dept_' + Date.now(), name, description: desc });
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('deptModal')).hide();
  showToast('Department added.', 'success');
  renderDepartmentsList();
});

window.deleteDept = function (id) {
  if (!confirm('Delete this department?')) return;
  window.db.departments = window.db.departments.filter(d => d.id !== id);
  saveToStorage();
  showToast('Department deleted.', 'success');
  renderDepartmentsList();
};


/* ══════════════════════════════════════════════════
   PHASE 6C: EMPLOYEES CRUD
══════════════════════════════════════════════════ */

function renderEmployeesTable() {
  const el = document.getElementById('employees-content');
  if (!window.db.employees.length) {
    el.innerHTML = emptyState('No employees yet.');
    return;
  }
  el.innerHTML = `
    <table class="table table-bordered table-hover table-sm">
      <thead class="table-light">
        <tr>
          <th>ID</th><th>Email</th><th>Position</th>
          <th>Department</th><th>Hire Date</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${window.db.employees.map(emp => {
          const dept = window.db.departments.find(d => d.id === emp.deptId);
          return `
            <tr>
              <td>${emp.employeeId}</td>
              <td>${emp.userEmail}</td>
              <td>${emp.position}</td>
              <td>${dept ? dept.name : '—'}</td>
              <td>${emp.hireDate || '—'}</td>
              <td>
                <button class="btn btn-outline-primary btn-sm me-1"
                        onclick="openEditEmployee('${emp.id}')">Edit</button>
                <button class="btn btn-outline-danger btn-sm"
                        onclick="deleteEmployee('${emp.id}')">Delete</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function populateDeptDropdown(selectedId = '') {
  document.getElementById('emp-dept').innerHTML =
    window.db.departments.map(d =>
      `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${d.name}</option>`
    ).join('');
}

document.getElementById('add-employee-btn').addEventListener('click', () => {
  document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  document.getElementById('employee-form').reset();
  document.getElementById('emp-edit-id').value = '';
  document.getElementById('employee-form-error').classList.add('d-none');
  populateDeptDropdown();
  new bootstrap.Modal(document.getElementById('employeeModal')).show();
});

window.openEditEmployee = function (id) {
  const emp = window.db.employees.find(e => e.id === id);
  if (!emp) return;
  document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
  document.getElementById('emp-edit-id').value   = emp.id;
  document.getElementById('emp-id-field').value  = emp.employeeId;
  document.getElementById('emp-email').value     = emp.userEmail;
  document.getElementById('emp-position').value  = emp.position;
  document.getElementById('emp-hire-date').value = emp.hireDate;
  document.getElementById('employee-form-error').classList.add('d-none');
  populateDeptDropdown(emp.deptId);
  new bootstrap.Modal(document.getElementById('employeeModal')).show();
};

document.getElementById('employee-save-btn').addEventListener('click', () => {
  const editId     = document.getElementById('emp-edit-id').value;
  const employeeId = document.getElementById('emp-id-field').value.trim();
  const userEmail  = document.getElementById('emp-email').value.trim().toLowerCase();
  const position   = document.getElementById('emp-position').value.trim();
  const deptId     = document.getElementById('emp-dept').value;
  const hireDate   = document.getElementById('emp-hire-date').value;
  const errEl      = document.getElementById('employee-form-error');

  if (!employeeId || !userEmail || !position)
    return showErr(errEl, 'ID, email, and position are required.');

  const matchedUser = window.db.accounts.find(a => a.email === userEmail);
  if (!matchedUser)
    return showErr(errEl, 'No account found with that email.');

  if (editId) {
    const emp = window.db.employees.find(e => e.id === editId);
    if (emp) Object.assign(emp, {
      employeeId, userEmail, userId: matchedUser.id, position, deptId, hireDate,
    });
    showToast('Employee updated.', 'success');
  } else {
    window.db.employees.push({
      id: 'emp_' + Date.now(),
      employeeId, userEmail, userId: matchedUser.id, position, deptId, hireDate,
    });
    showToast('Employee added.', 'success');
  }

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
  renderEmployeesTable();
});

window.deleteEmployee = function (id) {
  if (!confirm('Delete this employee?')) return;
  window.db.employees = window.db.employees.filter(e => e.id !== id);
  saveToStorage();
  showToast('Employee deleted.', 'success');
  renderEmployeesTable();
};


/* ══════════════════════════════════════════════════
   PHASE 7: REQUESTS
══════════════════════════════════════════════════ */

function renderRequestsList() {
  if (!currentUser) return;
  const el   = document.getElementById('requests-content');
  const mine = window.db.requests.filter(r => r.employeeEmail === currentUser.email);

  if (!mine.length) {
    el.innerHTML = emptyState('No requests yet. Click "+ New Request" to submit one.');
    return;
  }

  const badge = {
    Pending:  'bg-warning text-dark',
    Approved: 'bg-success',
    Rejected: 'bg-danger',
  };

  el.innerHTML = `
    <table class="table table-bordered table-hover table-sm">
      <thead class="table-light">
        <tr><th>#</th><th>Type</th><th>Items</th><th>Status</th><th>Date</th></tr>
      </thead>
      <tbody>
        ${mine.map(r => `
          <tr>
            <td><small class="text-muted">${r.id.slice(-6)}</small></td>
            <td>${r.type}</td>
            <td>${r.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
            <td>
              <span class="badge ${badge[r.status] || 'bg-secondary'}">
                ${r.status}
              </span>
            </td>
            <td><small>${r.date}</small></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function addRequestItemRow() {
  const container = document.getElementById('req-items-container');
  const row = document.createElement('div');
  row.className = 'req-item-row';
  row.innerHTML = `
    <input type="text" class="form-control form-control-sm item-name"
           placeholder="Item name"/>
    <input type="number" class="form-control form-control-sm qty-input item-qty"
           placeholder="Qty" min="1" value="1"/>
    <button type="button" class="btn-remove-item">× Remove</button>
  `;
  row.querySelector('.btn-remove-item').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

document.getElementById('add-item-btn').addEventListener('click', addRequestItemRow);

document.getElementById('request-save-btn').addEventListener('click', () => {
  const type  = document.getElementById('req-type').value;
  const errEl = document.getElementById('request-form-error');
  const rows  = document.querySelectorAll('#req-items-container .req-item-row');

  if (!rows.length)
    return showErr(errEl, 'Add at least one item.');

  const items = [];
  let valid = true;
  rows.forEach(row => {
    const name = row.querySelector('.item-name').value.trim();
    const qty  = parseInt(row.querySelector('.item-qty').value) || 1;
    if (!name) valid = false;
    else items.push({ name, qty });
  });

  if (!valid || !items.length)
    return showErr(errEl, 'All item names are required.');

  window.db.requests.push({
    id:            'req_' + Date.now(),
    type, items,
    status:        'Pending',
    date:          new Date().toLocaleDateString(),
    employeeEmail: currentUser.email,
  });
  saveToStorage();

  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  document.getElementById('req-items-container').innerHTML = '';
  errEl.classList.add('d-none');
  showToast('Request submitted!', 'success');
  renderRequestsList();
});

document.getElementById('requestModal').addEventListener('show.bs.modal', () => {
  document.getElementById('req-items-container').innerHTML = '';
  document.getElementById('request-form-error').classList.add('d-none');
  addRequestItemRow();
});


/* ══════════════════════════════════════════════════
   PHASE 8: TOASTS
══════════════════════════════════════════════════ */

function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const wrap  = document.getElementById('toast-container');
  const el    = document.createElement('div');
  el.className = `toast-custom toast-${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity    = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}


/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove('d-none');
}

function emptyState(msg) {
  return `<div class="empty-state"><p>${msg}</p></div>`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  restoreSession();
  if (!window.location.hash) window.location.hash = '#/';
  handleRouting();
});