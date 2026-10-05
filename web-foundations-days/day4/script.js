// DOM Element Selections
const noteTextarea = document.getElementById("note-text");
const charCountElem = document.getElementById("char-count");
const wordCountElem = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// Update character counter, word counter, and warning/over classes
function updateCounts() {
  const text = noteTextarea.value;
  const charCount = text.length;

  // Word count (splits by whitespace, handles empty string correctly)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Update text displays
  charCountElem.textContent = `${charCount} / 200 characters`;
  wordCountElem.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  // Manage character count styling classes
  if (charCount > 200) {
    charCountElem.classList.add("over");
    charCountElem.classList.remove("warning");
  } else if (charCount > 180) {
    charCountElem.classList.add("warning");
    charCountElem.classList.remove("over");
  } else {
    charCountElem.classList.remove("warning", "over");
  }
}

// Clear textarea, remove saved draft, and update counters
function clearAll() {
  noteTextarea.value = "";
  localStorage.removeItem("noteDraft");
  updateCounts();
}

// Input event listener: Update counters and save draft
noteTextarea.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem("noteDraft", noteTextarea.value);
});

// Clear button click listener
clearBtn.addEventListener("click", clearAll);

// Escape key inside textarea listener
noteTextarea.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearAll();
  }
});

// Theme toggle click listener
themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggleBtn.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Restore saved draft and theme settings on load
function init() {
  // Restore saved draft text
  const savedDraft = localStorage.getItem("noteDraft");
  if (savedDraft !== null) {
    noteTextarea.value = savedDraft;
  }

  // Restore saved theme preference
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggleBtn.textContent = "Dark mode";
  }

  // Initial call to sync counters with restored content
  updateCounts();
}

// Run initialization
init();