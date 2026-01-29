// script.js

// API configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbyhA9x4LSyluJcMPz1ZQaHckjm8Rdw85Djo8qrPZlwGdS0jPc30LakHjVtRQ0a8dK3MbA/exec';
const POLL_INTERVAL = 5000; // Poll every 5 seconds
const DEBOUNCE_DELAY = 1000; // Debounce save by 1 second

// Global variables
let notes = [];
let selectedNoteId = null;
let draggedNote = null;
let offsetX = 0;
let offsetY = 0;
let longPressTimer = null;
let pollTimer = null;
let saveDebounceTimer = null;
let isUpdating = false;

const LONG_PRESS_DURATION = 500;

// DOM elements
const addNoteBtn = document.getElementById('addNoteBtn');
const deleteBtn = document.getElementById('deleteBtn');
const notesContainer = document.getElementById('notesContainer');
const themeToggle = document.getElementById('themeToggle');
const loadingIndicator = document.getElementById('loadingIndicator');

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    loadNotesFromAPI(true); // Show loading only on initial load
    startPolling();
});

// ==================== THEME MANAGEMENT ====================

// Initialize theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'day';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Toggle between day and night themes
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'day' ? 'night' : 'day';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ==================== API FUNCTIONS ====================

// Load notes from API
async function loadNotesFromAPI(showIndicator = false) {
    try {
        // Only show loading on initial load
        if (showIndicator) {
            showLoading();
        }
        
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data.notes && Array.isArray(data.notes)) {
            // Only update if there are actual changes to avoid flicker
            if (JSON.stringify(notes) !== JSON.stringify(data.notes)) {
                notes = data.notes;
                renderNotes();
            }
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    } finally {
        if (showIndicator) {
            hideLoading();
        }
    }
}

// Save notes to API with debounce
function saveNotesToAPI() {
    // Clear existing debounce timer
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    // Set new debounce timer
    saveDebounceTimer = setTimeout(async () => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: notes })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('Notes saved successfully');
            }
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }, DEBOUNCE_DELAY);
}

// ==================== POLLING ====================

// Start polling for updates
function startPolling() {
    pollTimer = setInterval(() => {
        if (!isUpdating && !draggedNote) {
            loadNotesFromAPI(false); // Silent background sync
        }
    }, POLL_INTERVAL);
}

// Stop polling
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }
}

// ==================== UI HELPERS ====================

// Show loading indicator
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

// ==================== EVENT LISTENERS ====================

// Setup main event listeners
function setupEventListeners() {
    addNoteBtn.addEventListener('click', createNewNote);
    deleteBtn.addEventListener('click', deleteSelectedNote);
    themeToggle.addEventListener('click', toggleTheme);
}

// ==================== NOTE MANAGEMENT ====================

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create new note
function createNewNote() {
    isUpdating = true;
    
    const newNote = {
        id: generateId(),
        content: '',
        x: Math.random() * (window.innerWidth - 300) + 50,
        y: Math.random() * (window.innerHeight - 250) + 50,
        width: 260,
        height: 200
    };
    
    notes.push(newNote);
    renderNotes();
    saveNotesToAPI();
    
    isUpdating = false;
}

// Delete selected note
function deleteSelectedNote() {
    if (!selectedNoteId) return;
    
    isUpdating = true;
    
    // Remove from array
    notes = notes.filter(n => n.id !== selectedNoteId);
    
    // Re-render and save
    renderNotes();
    saveNotesToAPI();
    
    // Hide delete button
    selectedNoteId = null;
    deleteBtn.classList.add('hidden');
    
    isUpdating = false;
}

// Update note content
function updateNoteContent(id, content) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.content = content;
        saveNotesToAPI();
    }
}

// Update note position
function updateNotePosition(id, x, y) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.x = x;
        note.y = y;
        saveNotesToAPI();
    }
}

// Update note size
function updateNoteSize(id, width, height) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.width = width;
        note.height = height;
        saveNotesToAPI();
    }
}

// Select a note
function selectNote(id) {
    // Deselect previous
    if (selectedNoteId) {
        const prevSelected = document.querySelector(`[data-id="${selectedNoteId}"]`);
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
    }
    
    // Select new note
    selectedNoteId = id;
    const noteCard = document.querySelector(`[data-id="${id}"]`);
    if (noteCard) {
        noteCard.classList.add('selected');
        deleteBtn.classList.remove('hidden');
    }
}

// ==================== RENDERING ====================

// Render all notes to DOM
function renderNotes() {
    // Get current notes in DOM
    const existingNotes = Array.from(notesContainer.querySelectorAll('.note-card'));
    const existingIds = existingNotes.map(note => note.dataset.id);
    const newIds = notes.map(note => note.id);
    
    // Remove notes that no longer exist
    existingNotes.forEach(noteEl => {
        if (!newIds.includes(noteEl.dataset.id)) {
            noteEl.remove();
        }
    });
    
    // Add or update notes
    notes.forEach(note => {
        let noteCard = document.querySelector(`[data-id="${note.id}"]`);
        
        if (!noteCard) {
            // Create new note element
            noteCard = createNoteElement(note);
            notesContainer.appendChild(noteCard);
        } else {
            // Update existing note (only if not being dragged)
            if (draggedNote !== noteCard) {
                updateNoteElement(noteCard, note);
            }
        }
    });
}

// Create note DOM element
function createNoteElement(note) {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.dataset.id = note.id;
    
    // Set position and size
    noteCard.style.left = `${note.x}px`;
    noteCard.style.top = `${note.y}px`;
    noteCard.style.width = `${note.width}px`;
    noteCard.style.height = `${note.height}px`;
    
    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write your note here...';
    textarea.value = note.content;
    
    // Save content on input
    textarea.addEventListener('input', (e) => {
        updateNoteContent(note.id, e.target.value);
    });
    
    // Prevent drag when typing
    textarea.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });
    
    noteCard.appendChild(textarea);
    
    // Setup interactions
    setupNoteInteractions(noteCard, note);
    
    return noteCard;
}

// Update existing note element
function updateNoteElement(noteCard, note) {
    const textarea = noteCard.querySelector('textarea');
    
    // Update content if changed (and textarea not focused)
    if (textarea && textarea !== document.activeElement) {
        if (textarea.value !== note.content) {
            textarea.value = note.content;
        }
    }
    
    // Update position
    noteCard.style.left = `${note.x}px`;
    noteCard.style.top = `${note.y}px`;
    
    // Update size
    noteCard.style.width = `${note.width}px`;
    noteCard.style.height = `${note.height}px`;
}

// Setup note interactions (drag, long press, resize)
function setupNoteInteractions(noteCard, note) {
    // Pointer down - start drag or long press
    noteCard.addEventListener('pointerdown', (e) => {
        // Don't drag if clicking on resize corner
        const rect = noteCard.getBoundingClientRect();
        const isResizeCorner = (e.clientX > rect.right - 20) && (e.clientY > rect.bottom - 20);
        
        if (isResizeCorner) return;
        
        // Start long press timer
        longPressTimer = setTimeout(() => {
            selectNote(note.id);
        }, LONG_PRESS_DURATION);
        
        // Setup drag
        draggedNote = noteCard;
        offsetX = e.clientX - noteCard.offsetLeft;
        offsetY = e.clientY - noteCard.offsetTop;
        
        noteCard.style.cursor = 'grabbing';
        isUpdating = true;
    });
    
    // Pointer move - drag note
    const pointerMoveHandler = (e) => {
        if (draggedNote === noteCard) {
            // Cancel long press if moving
            clearTimeout(longPressTimer);
            
            requestAnimationFrame(() => {
                const newX = e.clientX - offsetX;
                const newY = e.clientY - offsetY;
                
                noteCard.style.left = `${newX}px`;
                noteCard.style.top = `${newY}px`;
                
                updateNotePosition(note.id, newX, newY);
            });
        }
    };
    
    // Pointer up - end drag
    const pointerUpHandler = () => {
        if (draggedNote === noteCard) {
            clearTimeout(longPressTimer);
            draggedNote = null;
            noteCard.style.cursor = 'move';
            isUpdating = false;
        }
    };
    
    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', pointerUpHandler);
    
    // Track resize with ResizeObserver
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            updateNoteSize(note.id, width, height);
        }
    });
    
    resizeObserver.observe(noteCard);
}

// ==================== CLEANUP ====================

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPolling();
});
