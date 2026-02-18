import { db, rtdb, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, onValue, push, set, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
const { createApp } = Vue;
createApp({
    data() {
        return {
            currentUser: null,
            activeTab: 'overview',
            userFilter: 'all',
            users: [],
            mentors: [],
            students: [],
            assignments: [],
            sessions: [],
            searchQuery: '',
            assignmentSearch: '',
            showAddUserModal: false,
            showAssignModal: false,
            editingUser: null,
            newUser: {
                email: '',
                displayName: '',
                role: 'mentee'
            },
            assignmentData: {
                studentEmail: '',
                mentorEmail: ''
            },
            showToast: false,
            toastMessage: ''
        };
    },
    computed: {
        filteredUsers() {
            let filtered = this.users;
            if (this.userFilter !== 'all') {
                if (this.userFilter === 'mentee') {
                    filtered = filtered.filter(u => u.role === 'mentee' || u.role === 'student');
                } else {
                    filtered = filtered.filter(u => u.role === this.userFilter);
                }
            }
            if (this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase();
                filtered = filtered.filter(u =>
                    (u.displayName || u.name || '').toLowerCase().includes(query) ||
                    (u.email || '').toLowerCase().includes(query)
                );
            }
            return filtered;
        },
        filteredAssignments() {
            if (!this.assignmentSearch.trim()) return this.assignments;
            const query = this.assignmentSearch.toLowerCase();
            return this.assignments.filter(a =>
                (a.studentName || '').toLowerCase().includes(query) ||
                (a.mentorName || '').toLowerCase().includes(query) ||
                (a.studentEmail || '').toLowerCase().includes(query) ||
                (a.mentorEmail || '').toLowerCase().includes(query)
            );
        }
    },
    mounted() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.loadAllData();
            } else {
                window.location.href = '/';
            }
        });
    },
    methods: {
        loadAllData() {
            this.loadUsers();
            this.loadAssignments();
            this.loadSessions();
        },
        async loadUsers() {
            try {
                const usersRef = collection(db, 'users');
                onSnapshot(usersRef, (snapshot) => {
                    this.users = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    this.mentors = this.users.filter(u => u.role === 'mentor');
                    this.students = this.users.filter(u => u.role === 'mentee' || u.role === 'student');
                });
            } catch (e) {
                console.error("Error loading users:", e);
                this.users = [];
                this.mentors = [];
                this.students = [];
            }
        },
        loadAssignments() {
            try {
                const assignmentsRef = collection(db, 'assignments');
                onSnapshot(assignmentsRef, (snapshot) => {
                    this.assignments = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                });
            } catch (e) {
                console.error("Error loading assignments:", e);
            }
        },
        loadSessions() {
            const sessionsRef = ref(rtdb, 'sessions');
            onValue(sessionsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.sessions = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .sort((a, b) => new Date(b.date) - new Date(a.date));
                } else {
                    this.sessions = [];
                }
            });
        },
        formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        },
        formatSessionDateTime(session) {
            if (!session.date) return 'N/A';
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const time = session.startTime || '00:00';
            return `${dateStr} at ${time}`;
        },
        getInitials(user) {
            const name = user.displayName || user.name || user.email || '';
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase() || '??';
        },
        showToastNotification(message) {
            this.toastMessage = message;
            this.showToast = true;
            setTimeout(() => { this.showToast = false; }, 3000);
        },
        editUser(user) {
            this.editingUser = user;
            this.newUser = {
                email: user.email,
                displayName: user.displayName || user.name || '',
                role: user.role
            };
            this.showAddUserModal = true;
        },
        async saveUser() {
            if (!this.newUser.email || !this.newUser.displayName) {
                this.showToastNotification('Please fill in all fields');
                return;
            }
            try {
                if (this.editingUser) {
                    await updateDoc(doc(db, 'users', this.editingUser.id), {
                        displayName: this.newUser.displayName,
                        role: this.newUser.role,
                        updatedAt: new Date()
                    });
                    this.showToastNotification('User updated successfully');
                } else {
                    const userId = 'user_' + Date.now();
                    await setDoc(doc(db, 'users', userId), {
                        email: this.newUser.email,
                        displayName: this.newUser.displayName,
                        role: this.newUser.role,
                        createdAt: new Date()
                    });
                    this.showToastNotification('User added successfully');
                }
                this.showAddUserModal = false;
                this.editingUser = null;
                this.newUser = { email: '', displayName: '', role: 'mentee' };
            } catch (e) {
                console.error("Error saving user:", e);
                this.showToastNotification('Error saving user');
            }
        },
        async deleteUser(user) {
            if (!confirm(`Delete user ${user.displayName || user.email}?`)) return;
            try {
                await deleteDoc(doc(db, 'users', user.id));
                const assignmentsRef = collection(db, 'assignments');
                const studentAssignments = query(assignmentsRef, where('studentId', '==', user.id));
                const mentorAssignments = query(assignmentsRef, where('mentorId', '==', user.id));
                const studentSnap = await getDocs(studentAssignments);
                const mentorSnap = await getDocs(mentorAssignments);
                for (const doc of studentSnap.docs) {
                    await deleteDoc(doc.ref);
                }
                for (const doc of mentorSnap.docs) {
                    await deleteDoc(doc.ref);
                }
                this.showToastNotification('User deleted');
            } catch (e) {
                console.error("Error deleting user:", e);
                this.showToastNotification('Error deleting user');
            }
        },
        async createAssignment() {
            if (!this.assignmentData.studentEmail || !this.assignmentData.mentorEmail) {
                this.showToastNotification('Please enter both emails');
                return;
            }
            const student = this.students.find(s => s.email === this.assignmentData.studentEmail);
            const mentor = this.mentors.find(m => m.email === this.assignmentData.mentorEmail);
            if (!student) {
                const studentId = 'student_' + Date.now();
                await setDoc(doc(db, 'users', studentId), {
                    email: this.assignmentData.studentEmail,
                    displayName: this.assignmentData.studentEmail.split('@')[0],
                    role: 'mentee',
                    createdAt: new Date()
                });
            }
            if (!mentor) {
                const mentorId = 'mentor_' + Date.now();
                await setDoc(doc(db, 'users', mentorId), {
                    email: this.assignmentData.mentorEmail,
                    displayName: this.assignmentData.mentorEmail.split('@')[0],
                    role: 'mentor',
                    createdAt: new Date()
                });
            }
            try {
                const existingStudent = student || this.students.find(s => s.email === this.assignmentData.studentEmail);
                const existingMentor = mentor || this.mentors.find(m => m.email === this.assignmentData.mentorEmail);
                const studentId = existingStudent?.id || 'student_' + Date.now();
                const mentorId = existingMentor?.id || 'mentor_' + Date.now();
                const existingAssignment = this.assignments.find(a =>
                    a.studentEmail === this.assignmentData.studentEmail &&
                    a.mentorEmail === this.assignmentData.mentorEmail
                );
                if (existingAssignment) {
                    this.showToastNotification('This assignment already exists');
                    return;
                }
                await addDoc(collection(db, 'assignments'), {
                    studentId: studentId,
                    studentEmail: this.assignmentData.studentEmail.toLowerCase().trim(),
                    studentName: existingStudent?.displayName || this.assignmentData.studentEmail.split('@')[0],
                    mentorId: mentorId,
                    mentorEmail: this.assignmentData.mentorEmail.toLowerCase().trim(),
                    mentorName: existingMentor?.displayName || this.assignmentData.mentorEmail.split('@')[0],
                    createdAt: new Date()
                });
                this.showAssignModal = false;
                this.assignmentData = { studentEmail: '', mentorEmail: '' };
                this.showToastNotification('Assignment created successfully');
            } catch (e) {
                console.error("Error creating assignment:", e);
                this.showToastNotification('Error creating assignment');
            }
        },
        async removeAssignment(assignment) {
            if (!confirm('Remove this assignment?')) return;
            try {
                await deleteDoc(doc(db, 'assignments', assignment.id));
                this.showToastNotification('Assignment removed');
            } catch (e) {
                console.error("Error removing assignment:", e);
                this.showToastNotification('Error removing assignment');
            }
        },
        async deleteSession(session) {
            if (!confirm('Delete this session?')) return;
            try {
                await remove(ref(rtdb, `sessions/${session.id}`));
                this.showToastNotification('Session deleted');
            } catch (e) {
                console.error("Error deleting session:", e);
                this.showToastNotification('Error deleting session');
            }
        }
    }
}).mount('#app');
