// script.js

// API configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbyhA9x4LSyluJcMPz1ZQaHckjm8Rdw85Djo8qrPZlwGdS0jPc30LakHjVtRQ0a8dK3MbA/exec';
const POLL_INTERVAL = 3000; // Poll every 3 seconds
const DEBOUNCE_DELAY = 500; // Debounce save by 0.5 seconds

// Global variables
let notes = [];
let selectedNoteId = null;
let draggedNote = null;
let offsetX = 0;
let offsetY = 0;
let longPressTimer = null;
let pollTimer = null;
let saveDebounceTimer = null;
let isSaving = false;
let lastSaveTime = 0;

const LONG_PRESS_DURATION = 500;
const MIN_SAVE_INTERVAL = 2000; // Minimum 2 seconds between polls after save

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
    loadNotesFromAPI(true);
    startPolling();
});

// ==================== THEME MANAGEMENT ====================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'day';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'day' ? 'night' : 'day';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ==================== API FUNCTIONS ====================

async function loadNotesFromAPI(showIndicator = false) {
    // Don't load if we just saved
    const timeSinceLastSave = Date.now() - lastSaveTime;
    if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
        console.log('Skipping load - too soon after save');
        return;
    }
    
    // Don't load if currently saving or dragging
    if (isSaving || draggedNote) {
        console.log('Skipping load - saving or dragging');
        return;
    }
    
    try {
        if (showIndicator) {
            showLoading();
        }
        
        const response = await fetch(API_URL);
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.notes && Array.isArray(data.notes)) {
            // Only update if there are changes
            const oldJson = JSON.stringify(notes);
            const newJson = JSON.stringify(data.notes);
            
            if (oldJson !== newJson) {
                console.log('Updating notes from server');
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

async function saveNotesToAPI() {
    // Clear existing debounce timer
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    // Set new debounce timer
    saveDebounceTimer = setTimeout(async () => {
        if (isSaving) {
            console.log('Already saving, skipping...');
            return;
        }
        
        isSaving = true;
        
        try {
            console.log('Saving notes to API:', notes);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: notes })
            });
            
            const data = await response.json();
            console.log('Save response:', data);
            
            if (data.status === 'success') {
                console.log('Notes saved successfully');
                lastSaveTime = Date.now();
            } else {
                console.error('Save failed:', data);
            }
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            isSaving = false;
        }
    }, DEBOUNCE_DELAY);
}

// ==================== POLLING ====================

function startPolling() {
    pollTimer = setInterval(() => {
        loadNotesFromAPI(false);
    }, POLL_INTERVAL);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }
}

// ==================== UI HELPERS ====================

function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    addNoteBtn.addEventListener('click', createNewNote);
    deleteBtn.addEventListener('click', deleteSelectedNote);
    themeToggle.addEventListener('click', toggleTheme);
}

// ==================== NOTE MANAGEMENT ====================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function createNewNote() {
    const newNote = {
        id: generateId(),
        content: '',
        x: Math.random() * (window.innerWidth - 300) + 50,
        y: Math.random() * (window.innerHeight - 250) + 50,
        width: 260,
        height: 200
    };
    
    console.log('Creating new note:', newNote);
    
    notes.push(newNote);
    renderNotes();
    
    // Save immediately without debounce for new notes
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    isSaving = true;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes: notes })
        });
        
        const data = await response.json();
        console.log('Create note response:', data);
        
        if (data.status === 'success') {
            console.log('New note saved successfully');
            lastSaveTime = Date.now();
        }
    } catch (error) {
        console.error('Error creating note:', error);
    } finally {
        isSaving = false;
    }
}

async function deleteSelectedNote() {
    if (!selectedNoteId) return;
    
    console.log('Deleting note:', selectedNoteId);
    
    notes = notes.filter(n => n.id !== selectedNoteId);
    
    renderNotes();
    
    selectedNoteId = null;
    deleteBtn.classList.add('hidden');
    
    // Save immediately
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    
    isSaving = true;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notes: notes })
        });
        
        const data = await response.json();
        console.log('Delete note response:', data);
        
        if (data.status === 'success') {
            console.log('Note deleted successfully');
            lastSaveTime = Date.now();
        }
    } catch (error) {
        console.error('Error deleting note:', error);
    } finally {
        isSaving = false;
    }
}

function updateNoteContent(id, content) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.content = content;
        saveNotesToAPI();
    }
}

function updateNotePosition(id, x, y) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.x = x;
        note.y = y;
        saveNotesToAPI();
    }
}

function updateNoteSize(id, width, height) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.width = width;
        note.height = height;
        saveNotesToAPI();
    }
}

function selectNote(id) {
    if (selectedNoteId) {
        const prevSelected = document.querySelector(`[data-id="${selectedNoteId}"]`);
        if (prevSelected) {
            prevSelected.classList.remove('selected');
        }
    }
    
    selectedNoteId = id;
    const noteCard = document.querySelector(`[data-id="${id}"]`);
    if (noteCard) {
        noteCard.classList.add('selected');
        deleteBtn.classList.remove('hidden');
    }
}

// ==================== RENDERING ====================

function renderNotes() {
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
            noteCard = createNoteElement(note);
            notesContainer.appendChild(noteCard);
        } else {
            if (draggedNote !== noteCard) {
                updateNoteElement(noteCard, note);
            }
        }
    });
}

function createNoteElement(note) {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.dataset.id = note.id;
    
    noteCard.style.left = `${note.x}px`;
    noteCard.style.top = `${note.y}px`;
    noteCard.style.width = `${note.width}px`;
    noteCard.style.height = `${note.height}px`;
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write your note here...';
    textarea.value = note.content;
    
    textarea.addEventListener('input', (e) => {
        updateNoteContent(note.id, e.target.value);
    });
    
    textarea.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
    });
    
    noteCard.appendChild(textarea);
    
    setupNoteInteractions(noteCard, note);
    
    return noteCard;
}

function updateNoteElement(noteCard, note) {
    const textarea = noteCard.querySelector('textarea');
    
    if (textarea && textarea !== document.activeElement) {
        if (textarea.value !== note.content) {
            textarea.value = note.content;
        }
    }
    
    noteCard.style.left = `${note.x}px`;
    noteCard.style.top = `${note.y}px`;
    noteCard.style.width = `${note.width}px`;
    noteCard.style.height = `${note.height}px`;
}

function setupNoteInteractions(noteCard, note) {
    noteCard.addEventListener('pointerdown', (e) => {
        const rect = noteCard.getBoundingClientRect();
        const isResizeCorner = (e.clientX > rect.right - 20) && (e.clientY > rect.bottom - 20);
        
        if (isResizeCorner) return;
        
        longPressTimer = setTimeout(() => {
            selectNote(note.id);
        }, LONG_PRESS_DURATION);
        
        draggedNote = noteCard;
        offsetX = e.clientX - noteCard.offsetLeft;
        offsetY = e.clientY - noteCard.offsetTop;
        
        noteCard.style.cursor = 'grabbing';
    });
    
    const pointerMoveHandler = (e) => {
        if (draggedNote === noteCard) {
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
    
    const pointerUpHandler = () => {
        if (draggedNote === noteCard) {
            clearTimeout(longPressTimer);
            draggedNote = null;
            noteCard.style.cursor = 'move';
        }
    };
    
    document.addEventListener('pointermove', pointerMoveHandler);
    document.addEventListener('pointerup', pointerUpHandler);
    
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            updateNoteSize(note.id, width, height);
        }
    });
    
    resizeObserver.observe(noteCard);
}

// ==================== CLEANUP ====================

window.addEventListener('beforeunload', () => {
    stopPolling();
});
