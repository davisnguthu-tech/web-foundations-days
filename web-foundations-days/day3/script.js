let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

/* ===== 1. searchNotes ===== */
function searchNotes(word) {
  return notes.filter((note) =>
    note.text.toLowerCase().includes(word.toLowerCase())
  );
}

// Normal case: Partial word match (case-insensitive)
console.log(searchNotes("study")); 
// Expected: [{ id: 2, text: "Finish the Day 3 assignment", category: "study" }, { id: 4, text: "Revise JavaScript arrays", category: "study" }]

// Edge case: Search term yields no matches
console.log(searchNotes("zebra")); 
// Expected: []


/* ===== 2. longestNote ===== */
function longestNote() {
  if (notes.length === 0) {
    return null;
  }

  return notes.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest
  );
}

// Normal case: Returns the note with the longest text string
console.log(longestNote()); 
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

// Edge case: Returns null when notes array is empty
const originalNotes = [...notes];
notes = [];
console.log(longestNote()); 
// Expected: null
notes = [...originalNotes]; // Restore original notes array


/* ===== 3. countByCategory ===== */
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    const category = note.category;
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

// Normal case: Returns category tallies for existing notes
console.log(countByCategory()); 
// Expected: { personal: 2, study: 2, work: 1 }

// Edge case: Empty object when no notes exist
notes = [];
console.log(countByCategory()); 
// Expected: {}
notes = [...originalNotes]; // Restore original notes array


/* ===== 4. getSummary ===== */
function getSummary() {
  const totalNotes = notes.length;
  const label = totalNotes === 1 ? "note" : "notes";
  const counts = countByCategory();

  const categoryDetails = Object.entries(counts)
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");

  return categoryDetails
    ? `${totalNotes} ${label}: ${categoryDetails}.`
    : `${totalNotes} ${label}.`;
}

// Normal case: Summary text with plural "notes" and category breakdowns
console.log(getSummary()); 
// Expected: "5 notes: 2 personal, 2 study, 1 work."

// Edge case: Single note summary using singular "note"
notes = [{ id: 1, text: "Buy milk and bread", category: "personal" }];
console.log(getSummary()); 
// Expected: "1 note: 1 personal."
notes = [...originalNotes]; // Restore original notes array


/* ===== 5. isDuplicate ===== */
function isDuplicate(text) {
  const cleanText = text.trim().toLowerCase();
  return notes.some(
    (note) => note.text.trim().toLowerCase() === cleanText
  );
}

// Normal case: Returns true for duplicate text with different casing and whitespace
console.log(isDuplicate("  BUY MILK AND BREAD  ")); 
// Expected: true

// Edge case: Returns false for non-existent note text
console.log(isDuplicate("Walk the dog")); 
// Expected: false


/* ===== 6. addNote ===== */
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Note not added: Text must be a string.");
    return false;
  }

  const validCategories = ["personal", "work", "study"];
  const trimmedText = text.trim();

  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Note not added: Text must be between 1 and 200 characters.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Note not added: Category must be 'personal', 'work', or 'study'.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Note not added: A duplicate note already exists.");
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: newId, text: trimmedText, category });
  return true;
}

// Normal case: Valid input adds note successfully
console.log(addNote("Schedule dentist appointment", "personal")); 
// Expected: true

// Edge case: Non-string input is safely rejected before calling trim
console.log(addNote(12345, "work")); 
// Logs: "Note not added: Text must be a string."
// Expected: false
