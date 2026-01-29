// script.js

// Global variables
let notes = [];
let selectedNoteId = null;
let draggedNote = null;
let offsetX = 0;
let offsetY = 0;
let longPressTimer = null;
const LONG_PRESS_DURATION = 500; // milliseconds

// DOM elements
const addNoteBtn = document.getElementById('addNoteBtn');
const deleteBtn = document.getElementById('deleteBtn');
const notesContainer = document.getElementById('notesContainer');

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    loadNotesFromStorage();
    renderNotes();
    setupEventListeners();
});

// Setup event listeners for main buttons
function setupEventListeners() {
    addNoteBtn.addEventListener('click', createNewNote);
    deleteBtn.addEventListener('click', deleteSelectedNote);
}

// Load notes from localStorage
function loadNotesFromStorage() {
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
        try {
            notes = JSON.parse(storedNotes);
        } catch (e) {
            console.error('Error loading notes:', e);
            notes = [];
        }
    }
}

// Save notes to localStorage
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// Generate unique ID for each note
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create a new note
function createNewNote() {
    const newNote = {
        id: generateId(),
        content: '',
        x: Math.random() * (window.innerWidth - 250) + 20,
        y: Math.random() * (window.innerHeight - 200) + 20,
        width: 250,
        height: 200
    };
    
    notes.push(newNote);
    saveNotesToStorage();
    renderNotes();
}

// Render all notes to the DOM
function renderNotes() {
    notesContainer.innerHTML = '';
    
    notes.forEach(note => {
        const noteCard = createNoteElement(note);
        notesContainer.appendChild(noteCard);
    });
}

// Create a note DOM element
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
    
    // Setup drag and long press events
    setupNoteInteractions(noteCard, note);
    
    return noteCard;
}

// Setup drag, long press, and resize for a note
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
    });
    
    // Pointer move - drag note
    document.addEventListener('pointermove', (e) => {
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
    });
    
    // Pointer up - end drag
    document.addEventListener('pointerup', () => {
        if (draggedNote === noteCard) {
            clearTimeout(longPressTimer);
            draggedNote = null;
            noteCard.style.cursor = 'move';
        }
    });
    
    // Track resize
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            updateNoteSize(note.id, width, height);
        }
    });
    
    resizeObserver.observe(noteCard);
}

// Update note content
function updateNoteContent(id, content) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.content = content;
        saveNotesToStorage();
    }
}

// Update note position
function updateNotePosition(id, x, y) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.x = x;
        note.y = y;
        saveNotesToStorage();
    }
}

// Update note size
function updateNoteSize(id, width, height) {
    const note = notes.find(n => n.id === id);
    if (note) {
        note.width = width;
        note.height = height;
        saveNotesToStorage();
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

// Delete selected note
function deleteSelectedNote() {
    if (!selectedNoteId) return;
    
    // Remove from array
    notes = notes.filter(n => n.id !== selectedNoteId);
    
    // Save and re-render
    saveNotesToStorage();
    renderNotes();
    
    // Hide delete button
    selectedNoteId = null;
    deleteBtn.classList.add('hidden');
}
