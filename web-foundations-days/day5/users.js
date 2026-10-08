// ==========================================
// 1. DOM Element Selections
// ==========================================
const loadUsersBtn = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusElem = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// In-memory user data store
let allUsers = [];

// ==========================================
// 2. Async Data Fetching (loadUsers)
// ==========================================
async function loadUsers() {
  // Update state & disable button during request
  loadUsersBtn.disabled = true;
  statusElem.textContent = "Loading users...";
  usersList.textContent = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    allUsers = await response.json();
    statusElem.textContent = `Successfully loaded ${allUsers.length} users.`;
    renderUsers(allUsers);
  } catch (error) {
    statusElem.textContent = "Failed to load users. Please try again later.";
    console.error("Error fetching users:", error);
  } finally {
    // Re-enable button after completion
    loadUsersBtn.disabled = false;
  }
}

// ==========================================
// 3. Render Users Function
// ==========================================
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "No users match your filter.";
    usersList.appendChild(emptyLi);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");
    li.style.padding = "0.75rem";
    li.style.borderBottom = "1px solid #ccc";
    li.style.marginBottom = "0.5rem";

    const nameElem = document.createElement("h3");
    nameElem.textContent = user.name;

    const emailElem = document.createElement("p");
    emailElem.textContent = `Email: ${user.email}`;

    const cityElem = document.createElement("p");
    cityElem.textContent = `City: ${user.address?.city || "N/A"}`;

    const companyElem = document.createElement("p");
    companyElem.textContent = `Company: ${user.company?.name || "N/A"}`;

    li.appendChild(nameElem);
    li.appendChild(emailElem);
    li.appendChild(cityElem);
    li.appendChild(companyElem);

    usersList.appendChild(li);
  });
}

// ==========================================
// 4. Filtering Logic (Input Event)
// ==========================================
function handleFilter() {
  if (allUsers.length === 0) {
    statusElem.textContent = "Please load users before filtering.";
    return;
  }

  const query = filterInput.value.trim().toLowerCase();
  const filtered = allUsers.filter((user) =>
    user.name.toLowerCase().includes(query)
  );
  renderUsers(filtered);
}

// ==========================================
// 5. Event Listeners
// ==========================================
if (loadUsersBtn) {
  loadUsersBtn.addEventListener("click", loadUsers);
}

if (filterInput) {
  filterInput.addEventListener("input", handleFilter);
}