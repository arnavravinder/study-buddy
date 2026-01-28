const { createApp } = Vue;

createApp({
    data() {
        return {
            notes: [],
            currentNote: null,
            mode: 'write',
            textStyle: null
        };
    },
    mounted() {
        this.loadNotes();
        if (this.notes.length === 0) {
            this.createNewNote();
        } else {
            this.currentNote = this.notes[0];
            this.$nextTick(() => {
                if (this.$refs.editor) {
                    this.$refs.editor.innerHTML = this.currentNote.content;
                }
            });
        }
    },
    watch: {
        currentNote(newNote, oldNote) {
            if (newNote && newNote !== oldNote) {
                this.$nextTick(() => {
                    if (this.$refs.editor) {
                        this.$refs.editor.innerHTML = newNote.content || '';
                    }
                });
            }
        }
    },
    methods: {
        loadNotes() {
            const savedNotes = localStorage.getItem('studyBuddyNotes');
            if (savedNotes) {
                this.notes = JSON.parse(savedNotes);
            }
        },
        saveNotes() {
            localStorage.setItem('studyBuddyNotes', JSON.stringify(this.notes));
        },
        createNewNote() {
            const newNote = {
                id: Date.now(),
                title: '',
                content: '',
                preview: '',
                date: new Date().toISOString()
            };
            this.notes.unshift(newNote);
            this.currentNote = newNote;
            this.saveNotes();
            this.$nextTick(() => {
                if (this.$refs.editor) {
                    this.$refs.editor.focus();
                }
            });
        },
        selectNote(note) {
            this.currentNote = note;
        },
        updateContent(e) {
            if (this.currentNote) {
                this.currentNote.content = e.target.innerHTML;
                this.currentNote.preview = e.target.innerText.substring(0, 100);
                this.currentNote.date = new Date().toISOString();
                this.saveNotes();
            }
        },
        saveNote() {
            if (this.currentNote) {
                this.currentNote.date = new Date().toISOString();
                this.saveNotes();
            }
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;

            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
        toggleBold() {
            document.execCommand('bold');
            this.textStyle = this.textStyle === 'bold' ? null : 'bold';
        },
        toggleItalic() {
            document.execCommand('italic');
            this.textStyle = this.textStyle === 'italic' ? null : 'italic';
        },
        toggleUnderline() {
            document.execCommand('underline');
            this.textStyle = this.textStyle === 'underline' ? null : 'underline';
        },
        insertBulletList() {
            document.execCommand('insertUnorderedList');
        },
        insertNumberedList() {
            document.execCommand('insertOrderedList');
        },
        toggleHighlight() {
            if (this.mode === 'highlight') {
                this.mode = 'write';
            } else {
                this.mode = 'highlight';
                this.highlightSelection();
            }
        },
        highlightSelection() {
            const selection = window.getSelection();
            if (selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.className = 'highlighted';
                range.surroundContents(span);
                selection.removeAllRanges();
                this.updateContent({ target: this.$refs.editor });
            }
        },
        handlePaste(e) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        },
        openWhiteboard() {
            window.location.href = 'whiteboard.html';
        }
    }
}).mount('#app');
