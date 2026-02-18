import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js';
import { db, rtdb, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, onValue, push, set, update, remove, serverTimestamp, query as rtdbQuery, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
createApp({
    data() {
        return {
            isLoading: true,
            authProcessed: false,
            currentUser: null,
            activeTab: 'dashboard',
            settingsSection: 'profile',
            resourceSubject: 'math',
            sessions: [],
            chats: [],
            activeChat: null,
            activeMessages: [],
            newMessage: '',
            showVideoModal: false,
            showToast: false,
            toastMessage: '',
            dropdowns: {},
            agoraClient: null,
            localAudioTrack: null,
            localVideoTrack: null,
            videoMuted: false,
            audioMuted: false,
            remoteUser: null,
            currentChannel: '',
            isJoiningCall: false,
            wbTool: 'pen',
            wbShape: 'rect',
            wbColor: '#1e1e1e',
            wbSize: 4,
            eraserMode: 'partial',
            showOptionsPanel: false,
            isDrawing: false,
            isDragging: false,
            isPanning: false,
            draggedPath: null,
            dragOffset: { x: 0, y: 0 },
            panStart: { x: 0, y: 0 },
            panOffset: { x: 0, y: 0 },
            laserPoint: null,
            laserTrail: [],
            ctx: null,
            canvas: null,
            paths: [],
            currentPath: null,
            textLabels: [],
            showHistoryModal: false,
            savedBoards: [],
            isSaving: false,
            lastSavedTime: null,
            autoSaveInterval: null,
            aiInput: '',
            messages: [],
            chatHistory: [],
            isAiThinking: false,
            currentChatId: null,
            pendingImage: null,
            currentToolUsed: null,
            showQuizMode: false,
            quizTopic: '',
            quizType: 'Mixed',
            isGeneratingQuiz: false,
            activeQuiz: null,
            aiSidebarTab: 'chats',
            savedQuizzes: [],
            showAssignModal: false,
            selectedQuizForAssignment: null,
            selectedStudentsForQuiz: [],
            quizMessages: [],
            quizInput: '',
            quizStep: 'topic',
            students: [],
            showScheduleModal: false,
            newSession: {
                studentId: '',
                studentName: '',
                subject: '',
                date: '',
                time: '',
                duration: 60,
                notes: ''
            },
            datePicker: null,
            timePicker: null,
            availability: {
                monday: { enabled: true, start: '09:00', end: '17:00' },
                tuesday: { enabled: true, start: '09:00', end: '17:00' },
                wednesday: { enabled: true, start: '09:00', end: '17:00' },
                thursday: { enabled: true, start: '09:00', end: '17:00' },
                friday: { enabled: true, start: '09:00', end: '17:00' },
                saturday: { enabled: false, start: '10:00', end: '14:00' },
                sunday: { enabled: false, start: '10:00', end: '14:00' }
            },
            settings: {
                emailNotifications: true,
                pushNotifications: true,
                sessionReminders: true,
                messageAlerts: true,
                weeklyReport: false
            },
            notes: [],
            activeNote: null,
            noteContent: '',
            noteTitle: 'Untitled',
            isNoteSaving: false,
            pendingBookings: [],
            chatSearch: '',
            showConfirmModal: false,
            confirmTitle: '',
            confirmMessage: '',
            confirmBtnText: 'Delete',
            confirmCallback: null,
            callTranscripts: []
        }
    },
    mounted() {
        onAuthStateChanged(auth, async (user) => {
            if (this.authProcessed) return;
            this.authProcessed = true;
            if (user) {
                this.currentUser = user;
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role && userData.role !== 'mentor') {
                        window.location.href = '/mentee/dashboard/';
                        return;
                    }
                }
                this.loadSessions();
                this.loadChats();
                this.loadStudents();
                this.loadSettings();
                this.loadNotes();
                this.loadPendingBookings();
                this.loadCallTranscripts();
            } else {
                window.location.href = '/';
                return;
            }
            this.isLoading = false;
        });
        document.addEventListener('click', () => { this.dropdowns = {}; });
        this.$watch('activeTab', (newTab) => {
            if (newTab === 'whiteboard') {
                this.$nextTick(() => { this.initCanvas(); });
                if (!this.autoSaveInterval) {
                    this.autoSaveInterval = setInterval(() => {
                        if (this.activeTab === 'whiteboard' && this.paths.length > 0) {
                            this.autoSave();
                        }
                    }, 5000);
                }
            }
            if (newTab === 'ai') {
                this.fetchSavedQuizzes();
                this.fetchChatHistory();
            }
            if (newTab === 'notes') {
                this.loadNotes();
            }
        });
        this.$watch('wbTool', (tool) => {
            if (!this.canvas) return;
            const cursors = {
                'hand': 'grab',
                'pointer': 'default',
                'pen': 'crosshair',
                'text': 'text',
                'shape': 'crosshair',
                'eraser': 'crosshair',
                'laser': 'crosshair'
            };
            this.canvas.style.cursor = cursors[tool] || 'crosshair';
        });
        const saved = localStorage.getItem('wb_paths');
        if (saved) {
            try { this.paths = JSON.parse(saved); } catch (e) { }
        }
        document.addEventListener('keydown', (e) => {
            if (this.activeTab !== 'whiteboard') return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            const shortcuts = {
                'h': () => { this.wbTool = 'hand'; this.showOptionsPanel = false; },
                '1': () => { this.wbTool = 'pointer'; this.showOptionsPanel = false; },
                '2': () => this.setShape('rect'),
                '3': () => this.setShape('diamond'),
                '4': () => this.setShape('circle'),
                '5': () => this.setShape('arrow'),
                '6': () => this.setShape('line'),
                '7': () => this.selectTool('pen'),
                '8': () => this.selectTool('text'),
                '0': () => this.selectTool('eraser'),
                'l': () => this.selectTool('laser'),
            };
            const key = e.key.toLowerCase();
            if (shortcuts[key]) {
                e.preventDefault();
                shortcuts[key]();
            }
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.excalidraw-toolbar') && !e.target.closest('.ex-options-panel')) {
                this.showOptionsPanel = false;
            }
        });
    },
    computed: {
        greeting() {
            const hour = new Date().getHours();
            if (hour < 12) return 'Morning';
            if (hour < 18) return 'Afternoon';
            return 'Evening';
        },
        currentDate() {
            return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        },
        quizProgress() {
            if (!this.activeQuiz) return 0;
            const answered = this.activeQuiz.questions.filter(q => q.answered).length;
            return (answered / this.activeQuiz.questions.length) * 100;
        },
        quizScore() {
            if (!this.activeQuiz) return 0;
            return this.activeQuiz.questions.filter(q => q.correct).length;
        },
        quizComplete() {
            if (!this.activeQuiz) return false;
            return this.activeQuiz.questions.every(q => q.answered);
        },
        todaySessions() {
            const today = new Date().toDateString();
            return this.sessions.filter(session => {
                const sessionDate = new Date(session.dateTime).toDateString();
                return sessionDate === today;
            }).map(session => ({
                ...session,
                time: new Date(session.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                student: session.studentName
            }));
        },
        upcomingSessions() {
            const now = Date.now();
            return this.sessions
                .filter(session => session.dateTime > now)
                .slice(0, 5)
                .map(session => ({
                    ...session,
                    date: new Date(session.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    time: new Date(session.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    student: session.studentName
                }));
        },
        allSessions() {
            const now = Date.now();
            return this.sessions
                .filter(session => session.dateTime > now)
                .map(session => ({
                    ...session,
                    date: new Date(session.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    time: new Date(session.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    student: session.studentName
                }));
        },
        renderedNote() {
            return '';
        },
        filteredChats() {
            if (!this.chatSearch.trim()) return this.chats;
            const q = this.chatSearch.toLowerCase();
            return this.chats.filter(chat => {
                const name = (chat.studentName || chat.mentorName || '').toLowerCase();
                const msg = (chat.lastMessage || '').toLowerCase();
                return name.includes(q) || msg.includes(q);
            });
        },
        availableTimeSlots() {
            const allSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];
            const selectedDate = this.newSession.date;
            if (!selectedDate) return allSlots.map(t => ({ time: t, available: true }));
            const bookedTimes = this.sessions
                .filter(s => s.date === selectedDate && s.status !== 'cancelled')
                .map(s => s.startTime);
            return allSlots.map(t => ({
                time: t,
                available: !bookedTimes.includes(t)
            }));
        }
    },
    methods: {
        loadCallTranscripts() {
            const transcriptsRef = ref(rtdb, 'callTranscripts');
            onValue(transcriptsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const userName = this.currentUser?.displayName || this.currentUser?.name || '';
                    this.callTranscripts = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value, expanded: false }))
                        .filter(ct => ct.mentorName === userName || ct.menteeName === userName)
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                } else {
                    this.callTranscripts = [];
                }
            });
        },
        formatSessionInfo(ct) {
            const d = new Date(ct.createdAt);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const mins = Math.floor((ct.duration || 0) / 60);
            const secs = (ct.duration || 0) % 60;
            return dateStr + ' \u2022 ' + mins + 'm ' + secs + 's';
        },
        formatDuration(val) {
            const map = { 30: '30 minutes', 60: '60 minutes', 90: '90 minutes' };
            return map[val] || '60 minutes';
        },
        async logout() {
            try {
                await signOut(auth);
                window.location.href = '/';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        },
        toggleDropdown(name) {
            const isOpen = this.dropdowns[name];
            this.dropdowns = {};
            if (!isOpen) this.dropdowns[name] = true;
        },
        selectDropdown(dropdownName, value, objectName, key) {
            this[objectName][key] = value;
            this.dropdowns = {};
        },
        closeDropdowns() {
            this.dropdowns = {};
        },
        formatDate(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        },
        formatMessageTime(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const now = new Date();
            const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            if (date.toDateString() === now.toDateString()) {
                return time;
            }
            const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${day}, ${time}`;
        },
        loadStudents() {
            const userEmail = this.currentUser.email?.toLowerCase().trim();
            const assignmentsQuery = query(collection(db, "assignments"), where("mentorEmail", "==", userEmail));
            onSnapshot(assignmentsQuery, async (snapshot) => {
                if (snapshot.docs.length > 0) {
                    const students = [];
                    for (const docSnap of snapshot.docs) {
                        const assignment = docSnap.data();
                        const studentDoc = await getDoc(doc(db, 'users', assignment.studentId));
                        if (studentDoc.exists()) {
                            const data = studentDoc.data();
                            students.push({
                                id: studentDoc.id,
                                name: data.displayName || data.name || 'Student',
                                initials: (data.displayName || data.name || 'ST').substring(0, 2).toUpperCase(),
                                grade: data.grade || 'Grade 11',
                                subject: data.subjects?.[0] || 'General',
                                email: data.email
                            });
                        } else {
                            const name = assignment.studentName || assignment.studentEmail.split('@')[0];
                            students.push({
                                id: assignment.studentId,
                                name: name,
                                initials: name.substring(0, 2).toUpperCase(),
                                grade: 'Grade 11',
                                subject: 'General',
                                email: assignment.studentEmail
                            });
                        }
                    }
                    this.students = students;
                } else {
                    this.students = [];
                }
            });
        },
        loadSessions() {
            const sessionsRef = ref(rtdb, 'sessions');
            onValue(sessionsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.sessions = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(s => s.mentorId === this.currentUser?.uid || !s.mentorId)
                        .sort((a, b) => a.dateTime - b.dateTime);
                } else {
                    this.sessions = [];
                }
            });
        },
        loadPendingBookings() {
            const bookingsRef = ref(rtdb, 'bookings');
            const userEmail = this.currentUser?.email?.toLowerCase();
            const userId = this.currentUser?.uid;
            onValue(bookingsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.pendingBookings = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(b => {
                            const byUid = b.mentorId === userId;
                            const byEmail = b.mentorEmail?.toLowerCase() === userEmail;
                            return (byUid || byEmail) && b.status === 'pending';
                        })
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                } else {
                    this.pendingBookings = [];
                }
            });
        },
        async approveBooking(booking) {
            try {
                let dateTime = booking.dateTime;
                if (!dateTime && booking.date && booking.time) {
                    dateTime = new Date(`${booking.date}T${booking.time}`).getTime();
                }
                if (!dateTime) {
                    dateTime = Date.now();
                }
                const sessionRef = push(ref(rtdb, 'sessions'));
                await set(sessionRef, {
                    mentorId: this.currentUser.uid,
                    mentorEmail: this.currentUser.email,
                    studentId: booking.studentId,
                    studentName: booking.studentName,
                    subject: booking.subject,
                    date: booking.date,
                    startTime: booking.time,
                    dateTime: dateTime,
                    duration: booking.duration || 60,
                    status: 'confirmed',
                    createdAt: Date.now()
                });
                await update(ref(rtdb, `bookings/${booking.id}`), { status: 'approved' });
                this.showToastNotification('Session approved and scheduled!');
            } catch (e) {
                console.error("Error approving booking:", e);
                this.showToastNotification('Error approving booking');
            }
        },
        async rejectBooking(booking) {
            try {
                await update(ref(rtdb, `bookings/${booking.id}`), { status: 'rejected' });
                this.showToastNotification('Booking request declined');
            } catch (e) {
                console.error("Error rejecting booking:", e);
            }
        },
        openScheduleModal() {
            this.showScheduleModal = true;
            this.newSession = {
                studentId: '',
                studentName: '',
                subject: '',
                date: '',
                time: '',
                duration: 60,
                notes: ''
            };
            this.$nextTick(() => {
                if (this.datePicker) { this.datePicker.destroy(); this.datePicker = null; }
                if (this.$refs.sessionDatePicker) {
                    this.datePicker = flatpickr(this.$refs.sessionDatePicker, {
                        dateFormat: 'Y-m-d',
                        minDate: 'today',
                        altInput: true,
                        altFormat: 'F j, Y',
                        onChange: (dates, dateStr) => {
                            this.newSession.date = dateStr;
                            this.newSession.time = '';
                        }
                    });
                }
            });
        },
        async createSession() {
            if (!this.newSession.studentId || !this.newSession.subject || !this.newSession.date || !this.newSession.time) {
                this.showToastNotification('Please fill in all required fields');
                return;
            }
            const student = this.students.find(s => s.id === this.newSession.studentId);
            const timeParts = this.newSession.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            if (timeParts[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (timeParts[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
            const dateTime = new Date(`${this.newSession.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`).getTime();
            try {
                const sessionRef = push(ref(rtdb, 'sessions'));
                await set(sessionRef, {
                    mentorId: this.currentUser.uid,
                    mentorName: this.currentUser.displayName || 'Mentor',
                    mentorEmail: this.currentUser.email,
                    studentId: this.newSession.studentId,
                    studentName: student?.name || this.newSession.studentName,
                    studentEmail: student?.email,
                    subject: this.newSession.subject,
                    date: this.newSession.date,
                    startTime: this.newSession.time,
                    dateTime: dateTime,
                    duration: this.newSession.duration,
                    notes: this.newSession.notes,
                    status: 'scheduled',
                    createdAt: Date.now()
                });
                this.showScheduleModal = false;
                this.showToastNotification('Session scheduled successfully!');
            } catch (e) {
                console.error("Error creating session:", e);
                this.showToastNotification('Error scheduling session');
            }
        },
        deleteSession(sessionId) {
            this.showConfirm('Cancel Session', 'Are you sure you want to cancel this session?', async () => {
                try {
                    await remove(ref(rtdb, `sessions/${sessionId}`));
                    this.showToastNotification('Session cancelled');
                } catch (e) {
                    console.error("Error deleting session:", e);
                }
            }, 'Cancel Session');
        },
        loadChats() {
            const chatsRef = ref(rtdb, 'chats');
            onValue(chatsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const userEmail = this.currentUser?.email;
                    const userId = this.currentUser?.uid;
                    this.chats = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(chat => {
                            const byUid = chat.participants && chat.participants.includes(userId);
                            const byEmail = chat.mentorEmail === userEmail;
                            return byUid || byEmail;
                        })
                        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
                    if (!this.activeChat && this.chats.length > 0) {
                        this.selectChat(this.chats[0]);
                    }
                } else {
                    this.chats = [];
                }
            });
        },
        selectChat(chat) {
            this.activeChat = chat;
            this.loadMessages(chat.id);
        },
        loadMessages(chatId) {
            const messagesRef = rtdbQuery(ref(rtdb, `messages/${chatId}`), orderByChild('timestamp'));
            onValue(messagesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.activeMessages = Object.entries(data).map(([key, value]) => ({
                        id: key,
                        ...value
                    }));
                    this.$nextTick(() => {
                        const container = document.querySelector('.messages-area');
                        if (container) container.scrollTop = container.scrollHeight;
                    });
                } else {
                    this.activeMessages = [];
                }
            });
        },
        sendChatMessage() {
            if (!this.currentUser) {
                this.showToastNotification("Error: You must be logged in.");
                return;
            }
            if (!this.activeChat) {
                this.showToastNotification("Error: No chat selected.");
                return;
            }
            if (!this.newMessage.trim()) return;
            const chatId = this.activeChat.id;
            const message = {
                text: this.newMessage,
                senderId: this.currentUser.uid,
                timestamp: serverTimestamp(),
                read: false
            };
            push(ref(rtdb, `messages/${chatId}`), message);
            update(ref(rtdb, `chats/${chatId}`), {
                lastMessage: this.newMessage,
                lastMessageTime: serverTimestamp()
            });
            this.newMessage = '';
        },
        startCall(session) {
            let channel;
            let menteeName = '';
            if (session) {
                channel = `session_${session.id}`;
                menteeName = session.studentName || '';
            } else if (this.activeChat) {
                channel = `chat_${this.activeChat.id}`;
                menteeName = this.activeChat.studentName || '';
            } else {
                this.showToastNotification('Please select a session or chat first');
                return;
            }
            const mentorName = this.currentUser.displayName || this.currentUser.name || 'Mentor';
            const params = new URLSearchParams({
                channel,
                mentor: mentorName,
                mentee: menteeName,
                role: 'mentor'
            });
            window.open(`/tools/call?${params.toString()}`, '_blank');
        },
        async initializeAgora(channelName) {
            try {
                if (typeof AgoraRTC === 'undefined') {
                    throw new Error('Agora SDK not loaded');
                }
                this.agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
                this.agoraClient.on("user-published", async (user, mediaType) => {
                    await this.agoraClient.subscribe(user, mediaType);
                    if (mediaType === "video") {
                        this.remoteUser = user;
                        this.$nextTick(() => {
                            const remoteEl = document.getElementById("remote-video");
                            if (remoteEl) user.videoTrack.play("remote-video");
                        });
                    }
                    if (mediaType === "audio") {
                        user.audioTrack.play();
                    }
                });
                this.agoraClient.on("user-unpublished", (user) => {
                    if (this.remoteUser === user) {
                        this.remoteUser = null;
                    }
                });
                this.agoraClient.on("user-left", () => {
                    this.remoteUser = null;
                });
                const uid = Math.floor(Math.random() * 10000);
                const response = await fetch('/api/agora-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelName, uid })
                });
                if (!response.ok) {
                    throw new Error(`Token request failed: ${response.status}`);
                }
                const data = await response.json();
                if (!data.token || !data.appID) {
                    throw new Error('Invalid token response from server');
                }
                if (!this.showVideoModal) {
                    return;
                }
                await this.agoraClient.join(data.appID, channelName, data.token, uid);
                [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                this.$nextTick(() => {
                    const localEl = document.getElementById("local-video");
                    if (localEl && this.localVideoTrack) {
                        this.localVideoTrack.play("local-video");
                    }
                });
                await this.agoraClient.publish([this.localAudioTrack, this.localVideoTrack]);
                this.isJoiningCall = false;
            } catch (error) {
                console.error("Agora Init Error:", error);
                this.showToastNotification("Failed to start call: " + error.message);
                this.endCall();
            }
        },
        async endCall() {
            this.isJoiningCall = false;
            try {
                if (this.localAudioTrack) {
                    this.localAudioTrack.stop();
                    this.localAudioTrack.close();
                    this.localAudioTrack = null;
                }
                if (this.localVideoTrack) {
                    this.localVideoTrack.stop();
                    this.localVideoTrack.close();
                    this.localVideoTrack = null;
                }
                if (this.agoraClient) {
                    await this.agoraClient.leave();
                    this.agoraClient = null;
                }
            } catch (error) {
                console.error("Error ending call:", error);
            }
            this.remoteUser = null;
            this.currentChannel = '';
            this.showVideoModal = false;
            this.videoMuted = false;
            this.audioMuted = false;
        },
        toggleAudio() {
            if (this.localAudioTrack) {
                this.audioMuted = !this.audioMuted;
                this.localAudioTrack.setMuted(this.audioMuted);
            }
        },
        toggleVideo() {
            if (this.localVideoTrack) {
                this.videoMuted = !this.videoMuted;
                this.localVideoTrack.setMuted(this.videoMuted);
            }
        },
        startChatWithStudent(student) {
            if (!this.currentUser) {
                this.showToastNotification("Error: You must be logged in.");
                return;
            }
            const studentId = student.id;
            const existingChat = this.chats.find(c => c.participants && c.participants.includes(studentId));
            if (existingChat) {
                this.activeTab = 'messages';
                this.selectChat(existingChat);
            } else {
                const chatId = 'chat_' + studentId + '_' + this.currentUser.uid;
                set(ref(rtdb, `chats/${chatId}`), {
                    participants: [this.currentUser.uid, studentId],
                    mentorName: this.currentUser.displayName || this.currentUser.name || 'Mentor',
                    studentName: student.name,
                    mentorEmail: this.currentUser.email,
                    studentEmail: student.email,
                    lastMessage: 'Started a new conversation',
                    lastMessageTime: serverTimestamp()
                }).then(() => {
                    this.activeTab = 'messages';
                    setTimeout(() => {
                        const newChat = this.chats.find(c => c.id === chatId);
                        if (newChat) this.selectChat(newChat);
                    }, 500);
                });
            }
        },
        selectTool(tool) {
            this.wbTool = tool;
            const drawingTools = ['pen', 'shape'];
            this.showOptionsPanel = drawingTools.includes(tool);
        },
        setShape(shape) {
            this.wbTool = 'shape';
            this.wbShape = shape;
            this.showOptionsPanel = true;
        },
        showToastNotification(message) {
            this.toastMessage = message;
            this.showToast = true;
            setTimeout(() => {
                this.showToast = false;
            }, 3000);
        },
        showConfirm(title, message, callback, btnText = 'Delete') {
            this.confirmTitle = title;
            this.confirmMessage = message;
            this.confirmBtnText = btnText;
            this.confirmCallback = callback;
            this.showConfirmModal = true;
        },
        confirmModalAction() {
            this.showConfirmModal = false;
            if (this.confirmCallback) this.confirmCallback();
        },
        toggleShapeMenu() {
            this.wbTool = 'shape';
            this.showOptionsPanel = true;
        },
        initCanvas() {
            const container = this.$refs.canvasArea;
            if (!container) return;
            this.canvas = this.$refs.drawCanvas;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.ctx = this.canvas.getContext('2d');
            this.animate();
            new ResizeObserver(() => {
                this.canvas.width = container.clientWidth;
                this.canvas.height = container.clientHeight;
                this.redrawAll();
            }).observe(container);
        },
        startDrawing(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.wbTool === 'hand') {
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'grabbing';
                return;
            }
            if (this.wbTool === 'pointer') {
                this.paths.forEach(p => p.selected = false);
                const hit = this.findHit(x, y);
                if (hit) {
                    hit.selected = true;
                    this.isDragging = true;
                    this.draggedPath = hit;
                    this.dragOffset = { x: x, y: y };
                    this.canvas.style.cursor = 'move';
                } else {
                    this.draggedPath = null;
                }
                return;
            }
            if (this.wbTool === 'text') return;
            if (this.wbTool === 'laser') {
                this.isDrawing = true;
                this.laserPoint = { x, y };
                return;
            }
            this.isDrawing = true;
            if (this.wbTool === 'eraser') {
                this.checkEraserCollision(x, y);
                return;
            }
            this.currentPath = {
                type: this.wbTool === 'shape' ? 'shape' : 'stroke',
                subType: this.wbTool === 'shape' ? this.wbShape : 'free',
                points: [{ x, y }],
                color: this.wbColor,
                size: this.wbSize,
                isLaser: false,
                created: Date.now(),
                isEraser: false,
                selected: false
            };
            this.paths.push(this.currentPath);
        },
        draw(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.isPanning) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.paths.forEach(p => {
                    p.points.forEach(pt => {
                        pt.x += dx;
                        pt.y += dy;
                    });
                });
                this.textLabels.forEach(t => {
                    t.x += dx;
                    t.y += dy;
                });
                this.panStart = { x: e.clientX, y: e.clientY };
                return;
            }
            if (this.wbTool === 'laser' && this.isDrawing) {
                this.laserPoint = { x, y };
                this.laserTrail.push({ x, y, time: Date.now() });
                if (this.laserTrail.length > 30) {
                    this.laserTrail.shift();
                }
                return;
            }
            if (this.isDragging && this.draggedPath) {
                const dx = x - this.dragOffset.x;
                const dy = y - this.dragOffset.y;
                this.draggedPath.points.forEach(p => {
                    p.x += dx;
                    p.y += dy;
                });
                this.dragOffset = { x, y };
                return;
            }
            if (!this.isDrawing) return;
            if (this.wbTool === 'eraser') {
                this.checkEraserCollision(x, y);
                return;
            }
            if (this.currentPath) {
                if (this.currentPath.type === 'shape') {
                    if (this.currentPath.points.length > 1) {
                        this.currentPath.points.pop();
                    }
                    this.currentPath.points.push({ x, y });
                } else {
                    this.currentPath.points.push({ x, y });
                }
            }
        },
        stopDrawing() {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'grab';
            }
            if (this.wbTool === 'laser') {
                this.laserPoint = null;
                // Don't clear trail immediately - let it fade out naturally
            }
            if (this.wbTool === 'pointer') {
                this.canvas.style.cursor = 'default';
            }
            this.isDrawing = false;
            this.isDragging = false;
            if (this.wbTool === 'shape' && this.currentPath) {
                this.currentPath.selected = true;
                this.draggedPath = this.currentPath;
                this.wbTool = 'pointer';
                this.showOptionsPanel = false;
            }
            this.currentPath = null;
            this.saveToSession(true);
        },
        findHit(x, y) {
            for (let i = this.paths.length - 1; i >= 0; i--) {
                const p = this.paths[i];
                if (p.isEraser || p.isLaser) continue;
                for (let pt of p.points) {
                    if (Math.abs(pt.x - x) < 20 && Math.abs(pt.y - y) < 20) {
                        return p;
                    }
                }
            }
            return null;
        },
        checkEraserCollision(x, y) {
            const threshold = 10;
            this.paths = this.paths.filter(path => {
                if (path.isEraser) return true;
                for (let pt of path.points) {
                    if (Math.abs(pt.x - x) < threshold && Math.abs(pt.y - y) < threshold) {
                        return false;
                    }
                }
                return true;
            });
        },
        addText(e) {
            if (this.wbTool !== 'text') return;
            if (e.target.classList.contains('floating-label')) return;
            const rect = this.$refs.canvasArea.getBoundingClientRect();
            this.textLabels.push({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                text: 'Click to edit',
                editing: true
            });
            this.wbTool = 'pointer';
            this.$nextTick(() => {
                const labels = this.$refs.canvasArea.querySelectorAll('.floating-label');
                const last = labels[labels.length - 1];
                if (last) last.focus();
            });
        },
        startDragLabel(e, index) {
            const label = this.textLabels[index];
            if (label.editing) return;
            const startX = e.clientX;
            const startY = e.clientY;
            const origX = label.x;
            const origY = label.y;
            let moved = false;
            const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
                label.x = origX + dx;
                label.y = origY + dy;
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (!moved) {
                    // Single click without dragging - no action (double click to edit)
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        },
        clearBoard() {
            this.paths = [];
            this.textLabels = [];
            this.saveToSession(true);
        },
        downloadBoard() {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.fillStyle = 'white';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(this.canvas, 0, 0);
            const link = document.createElement('a');
            link.download = 'study-buddy-whiteboard.png';
            link.href = tempCanvas.toDataURL();
            link.click();
        },
        saveToSession(silent = false) {
            const data = JSON.stringify(this.paths);
            localStorage.setItem('wb_paths', data);
            if (!silent) {
                this.showToastNotification('Saved to Session');
            }
        },
        async saveToCloud() {
            this.isSaving = true;
            try {
                await addDoc(collection(db, "whiteboards"), {
                    paths: JSON.stringify(this.paths),
                    textLabels: JSON.stringify(this.textLabels),
                    createdAt: new Date(),
                    userId: this.currentUser?.uid,
                    name: `Session ${new Date().toLocaleTimeString()}`
                });
                this.lastSavedTime = new Date();
            } catch (e) {
                console.error("Error adding document: ", e);
            }
            this.isSaving = false;
        },
        async autoSave() {
            if (this.isSaving) return;
            this.saveToSession(true);
            await this.saveToCloud();
        },
        formatLastSaved() {
            if (!this.lastSavedTime) return '';
            return 'Last saved ' + this.lastSavedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        },
        async fetchHistory() {
            try {
                this.showHistoryModal = true;
                this.savedBoards = [];
                const q = query(collection(db, "whiteboards"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    this.savedBoards.push({ id: doc.id, ...doc.data() });
                });
            } catch (e) {
                console.error("Error fetching history: ", e);
            }
        },
        loadBoard(board) {
            try {
                this.paths = JSON.parse(board.paths);
                this.showHistoryModal = false;
                this.showToastNotification('Board Loaded');
            } catch (e) {
                console.error("Error parsing board", e);
            }
        },
        triggerImageUpload() {
            this.$refs.imageUpload.click();
        },
        async handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;
            this.showToastNotification('Uploading image...');
            const formData = new FormData();
            formData.append("image", file);
            try {
                const response = await fetch("https://api.imgbb.com/1/upload?key=dba6b317c68e7c0cd7d885e5e68a2214", {
                    method: "POST",
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    this.pendingImage = result.data.url;
                    this.showToastNotification('Image uploaded successfully!');
                } else {
                    this.showToastNotification('Image upload failed');
                }
            } catch (err) {
                console.error("Upload error:", err);
                this.showToastNotification('Error uploading image');
            }
        },
        renderMarkdown(text) {
            if (!text) return '';
            let processed = text;
            const latexBlocks = [];
            if (typeof katex !== 'undefined') {
                processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
                    try {
                        const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
                        const placeholder = `%%LATEX_BLOCK_${latexBlocks.length}%%`;
                        latexBlocks.push(rendered);
                        return placeholder;
                    } catch (e) { return match; }
                });
                processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
                    try {
                        const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
                        const placeholder = `%%LATEX_BLOCK_${latexBlocks.length}%%`;
                        latexBlocks.push(rendered);
                        return placeholder;
                    } catch (e) { return match; }
                });
                processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
                    try {
                        const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
                        const placeholder = `%%LATEX_INLINE_${latexBlocks.length}%%`;
                        latexBlocks.push(rendered);
                        return placeholder;
                    } catch (e) { return match; }
                });
                processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
                    try {
                        const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
                        const placeholder = `%%LATEX_INLINE_${latexBlocks.length}%%`;
                        latexBlocks.push(rendered);
                        return placeholder;
                    } catch (e) { return match; }
                });
            }
            let html = '';
            try {
                html = marked.parse(processed);
            } catch (e) {
                html = processed;
            }
            latexBlocks.forEach((rendered, i) => {
                html = html.replace(`%%LATEX_BLOCK_${i}%%`, rendered);
                html = html.replace(`%%LATEX_INLINE_${i}%%`, rendered);
            });
            html = html.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
            return html;
        },
        startNewChat() {
            this.messages = [];
            this.currentChatId = null;
        },
        async loadChat(chat) {
            this.currentChatId = chat.id;
            this.messages = JSON.parse(chat.messages || '[]');
        },
        async sendAiMessage() {
            if (!this.aiInput.trim() && !this.pendingImage) return;
            const userMsg = {
                role: 'user',
                content: this.aiInput,
                image: this.pendingImage
            };
            this.messages.push(userMsg);
            const prompt = this.aiInput;
            this.aiInput = '';
            const imageToSend = this.pendingImage;
            this.pendingImage = null;
            this.isAiThinking = true;
            this.currentToolUsed = null;
            const aiMsg = { role: 'assistant', content: '', image: null };
            this.messages.push(aiMsg);
            const msgIndex = this.messages.length - 1;
            try {
                const toolDetection = this.detectToolUsage(prompt);
                if (toolDetection.tool) {
                    this.currentToolUsed = toolDetection;
                }
                const isImageGenerationRequest = /\b(generate|create|draw|make|show me|give me)\b.*(image|picture|photo|illustration|art|drawing|banner|logo|diagram|visual)/i.test(prompt);
                if (isImageGenerationRequest) {
                    this.currentToolUsed = { tool: 'Image Generation', icon: 'ph-image' };
                }
                if (toolDetection.agentic) {
                    const result = await this.executeAgenticAction(toolDetection.tool, prompt);
                    this.messages[msgIndex].content = result.message;
                    this.messages[msgIndex].actionTaken = result.success;
                    this.messages[msgIndex].toolUsed = toolDetection.tool;
                    this.messages[msgIndex].toolIcon = toolDetection.icon;
                } else if (isImageGenerationRequest || imageToSend) {
                    const apiMessages = this.messages.slice(0, -1).map(m => {
                        if (m.image && m.role === 'user') {
                            return {
                                role: m.role,
                                content: [
                                    { type: "text", text: m.content },
                                    { type: "image_url", image_url: { url: m.image } }
                                ]
                            };
                        }
                        return { role: m.role, content: m.content };
                    });
                    apiMessages.unshift({
                        role: 'system',
                        content: 'You are an AI that generates educational images. Create the image as requested. Only generate educational, family-friendly content.'
                    });
                    const response = await fetch("/api/ai", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            generateImage: isImageGenerationRequest,
                            messages: apiMessages,
                            stream: false
                        })
                    });
                    if (!response.ok) throw new Error(`API Error: ${response.status}`);
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content || '';
                    let generatedImage = null;
                    if (data.choices?.[0]?.message?.images?.length > 0) {
                        generatedImage = data.choices[0].message.images[0].image_url?.url || data.choices[0].message.images[0].url;
                    }
                    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
                    if (base64Match) {
                        generatedImage = base64Match[0];
                    }
                    this.messages[msgIndex].content = content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/, '').trim() || 'Here is the generated image:';
                    this.messages[msgIndex].image = generatedImage;
                    this.messages[msgIndex].toolUsed = this.currentToolUsed?.tool;
                    this.messages[msgIndex].toolIcon = this.currentToolUsed?.icon;
                } else {
                    const apiMessages = this.messages.slice(0, -1).map(m => {
                        if (m.image && m.role === 'user') {
                            return {
                                role: m.role,
                                content: [
                                    { type: "text", text: m.content },
                                    { type: "image_url", image_url: { url: m.image } }
                                ]
                            };
                        }
                        return { role: m.role, content: m.content };
                    });
                    const sessionContext = this.todaySessions.map(s => `- ${s.time}: ${s.student} (${s.subject})`).join('\n');
                    const studentNames = this.students.map(s => s.name || s.displayName).join(', ');
                    apiMessages.unshift({
                        role: 'system',
                        content: `You are an intelligent educational assistant for a mentor/tutor platform in India.
**Context (Today's Schedule):**
${sessionContext || 'No sessions scheduled today.'}
**Your Students:** ${studentNames || 'No students assigned yet.'}

**Your Agentic Capabilities (mention these when relevant):**
- Schedule sessions with students
- Message students directly
- Assign quizzes to students
- View schedule and student information

**Formatting Rules:**
- Use **Markdown** for formatting: headers, lists, bold, code blocks, tables
- Use **LaTeX** for math: inline with $...$ and block with $$...$$
- Do NOT use emojis.
- When mentioning currency, use INR (₹).
**Content Guidelines:**
- This is an EDUCATIONAL platform. Keep all content school-appropriate.
- Be accurate, helpful, and encouraging
- Provide detailed explanations when teaching concepts`
                    });
                    const response = await fetch("/api/ai", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            messages: apiMessages,
                            stream: true
                        })
                    });
                    if (!response.ok) throw new Error(`API Error: ${response.status}`);
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                try {
                                    const parsed = JSON.parse(data);
                                    const delta = parsed.choices?.[0]?.delta?.content;
                                    if (delta) {
                                        this.messages[msgIndex].content += delta;
                                        if (!this._lastScroll || Date.now() - this._lastScroll > 100) {
                                            this._lastScroll = Date.now();
                                            this.$nextTick(() => {
                                                const chatWindow = this.$refs.aiChatWindow;
                                                if (chatWindow) {
                                                    const isNearBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 150;
                                                    if (isNearBottom) {
                                                        chatWindow.scrollTop = chatWindow.scrollHeight;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                    this.messages[msgIndex].toolUsed = this.currentToolUsed?.tool;
                    this.messages[msgIndex].toolIcon = this.currentToolUsed?.icon;
                }
                this.saveChatToCloud();
            } catch (error) {
                console.error("AI Error:", error);
                this.messages[msgIndex].content = "Sorry, I encountered an error. Please try again.";
            } finally {
                this.isAiThinking = false;
                this.currentToolUsed = null;
            }
        },
        detectToolUsage(prompt) {
            const lowerPrompt = prompt.toLowerCase();
            if (/\b(generate|create|draw|make|show me)\b.*(image|picture|photo|illustration)/i.test(prompt)) {
                return { tool: 'Image Generation', icon: 'ph-image', agentic: false };
            }
            if (/\b(schedule|create|set up|book).*(session|class|meeting|tutoring)/i.test(prompt)) {
                return { tool: 'Schedule Session', icon: 'ph-calendar-plus', agentic: true };
            }
            if (/\b(message|tell|send|notify|text|write to|dm)\b/i.test(prompt) && this.students.some(s => lowerPrompt.includes((s.name || '').toLowerCase()))) {
                return { tool: 'Message Student', icon: 'ph-paper-plane-tilt', agentic: true };
            }
            if (/\b(message|tell|send|notify|text)\b.*(student|mentee)/i.test(prompt)) {
                return { tool: 'Message Student', icon: 'ph-paper-plane-tilt', agentic: true };
            }
            if (/\b(assign|give|send).*(quiz|test)/i.test(prompt)) {
                return { tool: 'Assign Quiz', icon: 'ph-exam', agentic: true };
            }
            if (/\b(quiz|test me|questions about|generate.*quiz|make.*quiz|create.*quiz)/i.test(prompt)) {
                return { tool: 'Quiz Generator', icon: 'ph-exam', agentic: true };
            }
            if (/\b(next session|upcoming|schedule|when is|calendar|today'?s? ?(session|class)?)/i.test(prompt)) {
                return { tool: 'View Schedule', icon: 'ph-calendar', agentic: true };
            }
            if (/\b(student|who are my|list students|about .* student|my mentees|my students)/i.test(prompt)) {
                return { tool: 'View Students', icon: 'ph-users', agentic: true };
            }
            if (/\b(solve|calculate|equation|integral|derivative|math|compute|\d+\s*[\+\-\*\/\^]\s*\d+)/i.test(prompt)) {
                return { tool: 'Math Solver', icon: 'ph-calculator', agentic: false };
            }
            return { tool: null, icon: null, agentic: false };
        },
        async executeAgenticAction(tool, prompt) {
            switch (tool) {
                case 'Schedule Session': {
                    if (this.students.length === 0) {
                        return { success: false, message: "You don't have any students assigned yet." };
                    }
                    const studentMatch = prompt.match(/(?:with|for)\s+(\w+(?:\s+\w+)?)/i);
                    let student = this.students[0];
                    if (studentMatch) {
                        const searchName = studentMatch[1].toLowerCase();
                        const found = this.students.find(s =>
                            (s.name || s.displayName || '').toLowerCase().includes(searchName)
                        );
                        if (found) student = found;
                    }
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const dateStr = tomorrow.toISOString().split('T')[0];
                    const timeMatch = prompt.match(/(\d{1,2})\s*(am|pm|:)/i);
                    let time = '16:00';
                    if (timeMatch) {
                        let hour = parseInt(timeMatch[1]);
                        if (timeMatch[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
                        if (timeMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0;
                        time = `${hour.toString().padStart(2, '0')}:00`;
                    }
                    const subjectMatch = prompt.match(/(?:for|about|on)\s+(\w+(?:\s+\w+)?)\s+(?:session|class)/i);
                    const subject = subjectMatch ? subjectMatch[1] : 'Tutoring Session';
                    const sessionId = 'session_' + Date.now();
                    try {
                        const sessionDateTime = new Date(`${dateStr}T${time}:00`).getTime();
                        await set(ref(rtdb, `sessions/${sessionId}`), {
                            mentorId: this.currentUser.uid,
                            mentorName: this.currentUser.displayName || 'Mentor',
                            mentorEmail: this.currentUser.email,
                            studentId: student.id,
                            studentName: student.name || student.displayName || 'Student',
                            studentEmail: student.email,
                            subject: subject,
                            date: dateStr,
                            startTime: time,
                            endTime: `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`,
                            dateTime: sessionDateTime,
                            status: 'scheduled',
                            createdAt: Date.now()
                        });
                        this.loadSessions();
                        return {
                            success: true,
                            message: `I've scheduled a **${subject}** session with **${student.name || student.displayName}** for **${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}** at **${time}**.\n\nThe student will be notified of this session.`
                        };
                    } catch (e) {
                        console.error("Session scheduling error:", e);
                        return { success: false, message: "Sorry, I couldn't schedule the session. Please try again." };
                    }
                }
                case 'Message Student': {
                    if (this.students.length === 0) {
                        return { success: false, message: "You don't have any students to message." };
                    }
                    let student = null;
                    for (const s of this.students) {
                        const name = (s.name || s.displayName || '').toLowerCase();
                        if (name && prompt.toLowerCase().includes(name)) {
                            student = s;
                            break;
                        }
                        const firstName = name.split(' ')[0];
                        if (firstName && prompt.toLowerCase().includes(firstName)) {
                            student = s;
                            break;
                        }
                    }
                    if (!student) {
                        const studentMatch = prompt.match(/(?:message|tell|send to|notify|text|dm)\s+(\w+)/i);
                        if (studentMatch) {
                            const searchName = studentMatch[1].toLowerCase();
                            const found = this.students.find(s =>
                                (s.name || s.displayName || '').toLowerCase().includes(searchName)
                            );
                            if (found) student = found;
                        }
                    }
                    if (!student) student = this.students[0];
                    let messageContent = prompt;
                    const msgPatterns = [
                        /(?:saying|that|to say|message:?|tell \w+)\s+["']?(.+?)["']?\s*$/i,
                        /(?:send|message|text|dm)\s+\w+\s+(.+)/i
                    ];
                    for (const pat of msgPatterns) {
                        const m = prompt.match(pat);
                        if (m) { messageContent = m[1]; break; }
                    }
                    messageContent = messageContent.replace(/^(message|send|text|tell|notify|dm)\s+\w+\s*/i, '').trim() || prompt;
                    const chatId = 'chat_' + this.currentUser.uid + '_' + student.id;
                    try {
                        const chatRef = ref(rtdb, `chats/${chatId}`);
                        await set(chatRef, {
                            participants: [this.currentUser.uid, student.id],
                            studentId: student.id,
                            studentName: student.name || student.displayName,
                            studentEmail: student.email,
                            mentorId: this.currentUser.uid,
                            mentorName: this.currentUser.displayName || 'Mentor',
                            mentorEmail: this.currentUser.email,
                            lastMessage: messageContent,
                            lastMessageTime: Date.now()
                        });
                        await push(ref(rtdb, `messages/${chatId}`), {
                            text: messageContent,
                            senderId: this.currentUser.uid,
                            timestamp: serverTimestamp(),
                            read: false
                        });
                        return {
                            success: true,
                            message: `I've sent your message to **${student.name || student.displayName}**:\n\n> "${messageContent}"\n\nYou can continue the conversation in the Messages tab.`
                        };
                    } catch (e) {
                        console.error("Message error:", e);
                        return { success: false, message: "Sorry, I couldn't send the message. Please try again." };
                    }
                }
                case 'Assign Quiz': {
                    if (this.students.length === 0) {
                        return { success: false, message: "You don't have any students to assign quizzes to." };
                    }
                    if (this.savedQuizzes.length === 0) {
                        return { success: false, message: "You don't have any saved quizzes yet. Generate a quiz first, then assign it." };
                    }
                    const studentMatch = prompt.match(/(?:to|for)\s+(\w+)/i);
                    let student = this.students[0];
                    if (studentMatch) {
                        const searchName = studentMatch[1].toLowerCase();
                        const found = this.students.find(s =>
                            (s.name || s.displayName || '').toLowerCase().includes(searchName)
                        );
                        if (found) student = found;
                    }
                    const quiz = this.savedQuizzes[0];
                    let questions = quiz.questions;
                    if (typeof questions === 'string') {
                        questions = JSON.parse(questions);
                    }
                    const questionsString = JSON.stringify(questions.map(q => ({
                        question: q.question || '',
                        type: q.type || 'mcq',
                        options: q.options || [],
                        answer: q.answer || '',
                        explanation: q.explanation || ''
                    })));
                    const assignmentId = `quiz_${quiz.id}_${student.id}_${Date.now()}`;
                    try {
                        await set(ref(rtdb, `assignedQuizzes/${assignmentId}`), {
                            quizId: quiz.id,
                            title: quiz.title || 'Quiz',
                            questions: questionsString,
                            studentId: student.id,
                            studentName: student.name || student.displayName || 'Student',
                            mentorId: this.currentUser.uid,
                            mentorName: this.currentUser.displayName || 'Mentor',
                            assignedAt: Date.now(),
                            completed: false
                        });
                        return {
                            success: true,
                            message: `I've assigned the quiz "**${quiz.title}**" to **${student.name || student.displayName}**. They will see it in their dashboard.`
                        };
                    } catch (e) {
                        console.error("Quiz assignment error:", e);
                        return { success: false, message: "Sorry, I couldn't assign the quiz. Please try again." };
                    }
                }
                case 'View Schedule': {
                    const sessions = this.todaySessions || [];
                    if (sessions.length === 0) {
                        return { success: true, message: "You don't have any sessions scheduled for today. Would you like me to help you schedule one?" };
                    }
                    let scheduleText = "**Today's Sessions:**\n\n";
                    sessions.forEach(s => {
                        scheduleText += `- **${s.time}** - ${s.subject} with ${s.student}\n`;
                    });
                    return { success: true, message: scheduleText };
                }
                case 'View Students': {
                    if (this.students.length === 0) {
                        return { success: true, message: "You don't have any students assigned yet." };
                    }
                    let studentText = "**Your Students:**\n\n";
                    this.students.forEach(s => {
                        studentText += `- **${s.name || s.displayName}** - ${s.grade || 'Grade N/A'}\n`;
                    });
                    return { success: true, message: studentText };
                }
                case 'Quiz Generator': {
                    const topicMatch = prompt.match(/(?:quiz|test me|questions about|on)\s+(.+)/i);
                    const topic = topicMatch ? topicMatch[1].trim() : prompt;
                    try {
                        const response = await fetch("/api/ai", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                messages: [
                                    { role: "system", content: "You are a helpful assistant for teachers. Generate educational quizzes." },
                                    { role: "user", content: `Generate a quiz with 5 multiple choice questions about: ${topic}. Return ONLY valid JSON with this format: {"title": "Quiz Title", "questions": [{"type": "mcq", "question": "Question text?", "options": ["A", "B", "C", "D"], "answer": "Correct option", "explanation": "Brief explanation"}]}` }
                                ]
                            })
                        });
                        const data = await response.json();
                        let quizText = data.choices[0].message.content;
                        quizText = quizText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        const quiz = JSON.parse(quizText);
                        quiz.questions = quiz.questions.map(q => ({
                            ...q,
                            answered: false,
                            correct: false,
                            userAnswer: ''
                        }));
                        this.activeQuiz = quiz;
                        this.aiSidebarTab = 'quizzes';
                        await this.saveQuizToFirebase(quiz);
                        return {
                            success: true,
                            message: `I've generated an interactive quiz on **${topic}**! You can see it now in the Quizzes tab. It has ${quiz.questions.length} questions for you to try.`
                        };
                    } catch (e) {
                        console.error("Quiz generation error:", e);
                        return { success: false, message: "Sorry, I couldn't generate the quiz. Please try again." };
                    }
                }
                default:
                    return { success: false, message: "I'm not sure how to help with that action." };
            }
        },
        async saveChatToCloud() {
            const firstUserMsg = this.messages.find(m => m.role === 'user')?.content || '';
            let title = firstUserMsg.substring(0, 50).trim();
            if (firstUserMsg.length > 50) {
                const lastSpace = title.lastIndexOf(' ');
                if (lastSpace > 20) title = title.substring(0, lastSpace);
                title += '...';
            }
            title = title || 'New Chat';
            try {
                if (this.currentChatId) {
                    await updateDoc(doc(db, "chats", this.currentChatId), {
                        messages: JSON.stringify(this.messages),
                        updatedAt: new Date()
                    });
                } else {
                    const docRef = await addDoc(collection(db, "chats"), {
                        title: title,
                        messages: JSON.stringify(this.messages),
                        userId: this.currentUser?.uid,
                        createdAt: new Date()
                    });
                    this.currentChatId = docRef.id;
                    this.fetchChatHistory();
                }
            } catch (e) {
                console.error("Error saving chat", e);
            }
        },
        async fetchChatHistory() {
            try {
                const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                this.chatHistory = [];
                querySnapshot.forEach((doc) => {
                    this.chatHistory.push({ id: doc.id, ...doc.data() });
                });
            } catch (e) {
                console.error("History fetch error", e);
            }
        },
        sanitizeInput(str) {
            if (!str) return '';
            return String(str).replace(/[<>'"&]/g, c => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '&': '&amp;' }[c]));
        },
        isValidEducationalTopic(topic) {
            const blockedPatterns = [
                /\b(nsfw|adult|explicit|porn|sex|nude|erotic)\b/i,
                /\b(hack|exploit|malware|virus|phishing|crack)\b/i
            ];
            return !blockedPatterns.some(p => p.test(topic));
        },
        async generateQuiz() {
            const sanitizedTopic = this.sanitizeInput(this.quizTopic.trim());
            if (!sanitizedTopic) return;
            if (!this.isValidEducationalTopic(sanitizedTopic)) {
                this.showToastNotification('Please enter a valid educational topic.');
                return;
            }
            this.isGeneratingQuiz = true;
            const typePrompt = {
                'MCQ': 'multiple choice questions with 4 options',
                'Fill Blanks': 'fill in the blank questions',
                'True/False': 'true or false questions',
                'Mixed': 'a mix of multiple choice, fill in the blank, and true/false questions'
            }[this.quizType];
            const prompt = `Generate an EDUCATIONAL quiz with 5 ${typePrompt} about "${sanitizedTopic}".
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "title": "Quiz Title",
  "questions": [
    {"type": "mcq", "question": "Question text?", "options": ["A", "B", "C", "D"], "answer": "Correct option text", "explanation": "Brief explanation"},
    {"type": "fill", "question": "The capital of France is ____.", "answer": "Paris", "explanation": "Brief explanation"},
    {"type": "truefalse", "question": "Statement to evaluate", "answer": "True", "explanation": "Brief explanation"}
  ]
}`;
            try {
                const response = await fetch("/api/ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-3-flash-preview",
                        messages: [
                            { role: "system", content: "You are a helpful assistant for teachers." },
                            { role: "user", content: `Generate a short quiz (3-5 questions) about: ${sanitizedTopic}. Format as JSON with 'questions' array containing object with 'question', 'options' (array), 'answer' (string).` }
                        ],
                        source: 'mentor'
                    })
                });
                const data = await response.json();
                let quizText = data.choices[0].message.content;
                quizText = quizText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                const quiz = JSON.parse(quizText);
                quiz.questions = quiz.questions.map(q => ({
                    ...q,
                    answered: false,
                    correct: false,
                    userAnswer: ''
                }));
                this.activeQuiz = quiz;
                this.showQuizMode = false;
                await this.saveQuizToFirebase(quiz);
            } catch (e) {
                console.error("Quiz generation error:", e);
                this.showToastNotification('Failed to generate quiz. Please try again.');
            }
            this.isGeneratingQuiz = false;
        },
        async saveQuizToFirebase(quiz) {
            try {
                const docRef = await addDoc(collection(db, "quizzes"), {
                    title: quiz.title,
                    questions: JSON.stringify(quiz.questions),
                    questionCount: quiz.questions.length,
                    createdBy: this.currentUser?.uid,
                    createdAt: new Date(),
                    assignedTo: []
                });
                quiz.id = docRef.id;
                this.savedQuizzes.unshift({
                    id: docRef.id,
                    title: quiz.title,
                    questionCount: quiz.questions.length,
                    createdAt: new Date(),
                    assignedTo: []
                });
                this.showToastNotification('Quiz saved!');
            } catch (e) {
                console.error("Quiz save error:", e);
            }
        },
        async fetchSavedQuizzes() {
            try {
                const q = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                this.savedQuizzes = [];
                snap.forEach(doc => this.savedQuizzes.push({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error("Quiz fetch error:", e);
            }
        },
        loadSavedQuiz(quiz) {
            const questions = typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions;
            this.activeQuiz = {
                id: quiz.id,
                title: quiz.title,
                questions: questions.map(q => ({ ...q, answered: false, correct: false, userAnswer: '' }))
            };
            this.showQuizMode = false;
        },
        openAssignModal(quiz) {
            this.selectedQuizForAssignment = quiz;
            this.selectedStudentsForQuiz = [];
            this.showAssignModal = true;
        },
        async assignQuizToStudents() {
            if (!this.selectedQuizForAssignment || this.selectedStudentsForQuiz.length === 0) return;
            try {
                const quiz = this.selectedQuizForAssignment;
                let questions = quiz.questions;
                if (typeof questions === 'string') {
                    questions = JSON.parse(questions);
                }
                const questionsString = JSON.stringify(questions.map(q => ({
                    question: q.question || '',
                    type: q.type || 'mcq',
                    options: q.options || [],
                    answer: q.answer || '',
                    explanation: q.explanation || ''
                })));
                for (const studentId of this.selectedStudentsForQuiz) {
                    const student = this.students.find(s => s.id === studentId);
                    const assignmentId = `quiz_${quiz.id}_${studentId}_${Date.now()}`;
                    await set(ref(rtdb, `assignedQuizzes/${assignmentId}`), {
                        quizId: quiz.id,
                        title: quiz.title || 'Quiz',
                        questions: questionsString,
                        studentId: studentId,
                        studentName: student?.name || 'Student',
                        mentorId: this.currentUser.uid,
                        mentorName: this.currentUser.displayName || 'Mentor',
                        assignedAt: Date.now(),
                        completed: false
                    });
                }
                const quizRef = doc(db, "quizzes", quiz.id);
                await updateDoc(quizRef, { assignedTo: this.selectedStudentsForQuiz });
                const idx = this.savedQuizzes.findIndex(q => q.id === quiz.id);
                if (idx > -1) this.savedQuizzes[idx].assignedTo = [...this.selectedStudentsForQuiz];
                this.showToastNotification(`Quiz assigned to ${this.selectedStudentsForQuiz.length} student(s)!`);
                this.showAssignModal = false;
                this.selectedStudentsForQuiz = [];
            } catch (e) {
                console.error("Quiz assignment error:", e);
                this.showToastNotification('Failed to assign quiz.');
            }
        },
        sendQuizMessage() {
            const userInput = this.quizInput.trim();
            if (!userInput) return;
            this.quizMessages.push({ role: 'user', content: userInput });
            this.quizInput = '';
            if (this.quizStep === 'topic') {
                if (!this.isValidEducationalTopic(userInput)) {
                    this.quizMessages.push({
                        role: 'assistant',
                        content: 'Please enter a valid educational topic.'
                    });
                    return;
                }
                this.quizTopic = userInput;
                this.quizStep = 'type';
                this.quizMessages.push({
                    role: 'assistant',
                    content: `Great! <strong>${userInput}</strong> is a good topic. What type of questions?`,
                    buttons: ['Multiple Choice', 'Fill in Blanks', 'True/False', 'Mixed']
                });
            } else if (this.quizStep === 'difficulty') {
                this.quizStep = 'generate';
                this.generateQuizFromConversation();
            }
        },
        handleQuizButton(buttonText) {
            this.quizMessages.push({ role: 'user', content: buttonText });
            if (this.quizStep === 'type') {
                const typeMap = {
                    'Multiple Choice': 'MCQ',
                    'Fill in Blanks': 'Fill Blanks',
                    'True/False': 'True/False',
                    'Mixed': 'Mixed'
                };
                this.quizType = typeMap[buttonText] || 'Mixed';
                this.quizStep = 'difficulty';
                this.quizMessages.push({
                    role: 'assistant',
                    content: 'How difficult should the quiz be?',
                    buttons: ['Easy', 'Medium', 'Hard']
                });
            } else if (this.quizStep === 'difficulty') {
                this.quizStep = 'generate';
                this.generateQuizFromConversation(buttonText.toLowerCase());
            }
        },
        async generateQuizFromConversation(difficulty = 'medium') {
            this.isGeneratingQuiz = true;
            const typePrompt = {
                'MCQ': 'multiple choice questions with 4 options',
                'Fill Blanks': 'fill in the blank questions',
                'True/False': 'true or false questions',
                'Mixed': 'a mix of multiple choice, fill in the blank, and true/false questions'
            }[this.quizType];
            const prompt = `Generate an EDUCATIONAL quiz with 5 ${typePrompt} about "${this.quizTopic}".
Difficulty level: ${difficulty}
Return ONLY valid JSON (no markdown):
{
  "title": "Quiz Title",
  "questions": [
    {"type": "mcq", "question": "Question?", "options": ["A", "B", "C", "D"], "answer": "Correct", "explanation": "Brief explanation"}
  ]
}`;
            try {
                const response = await fetch("/api/ai", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-3-flash-preview",
                        messages: [{ role: "user", content: prompt }],
                        source: 'mentor'
                    })
                });
                const data = await response.json();
                let quizText = data.choices[0].message.content;
                quizText = quizText.replace(/```json\n?|```/g, '').trim();
                const quizData = JSON.parse(quizText);
                this.activeQuiz = {
                    title: quizData.title,
                    questions: quizData.questions.map(q => ({
                        ...q,
                        answered: false,
                        correct: false,
                        userAnswer: ''
                    }))
                };
                await this.saveQuizToFirebase(this.activeQuiz);
                this.quizStep = 'topic';
                this.quizMessages = [];
            } catch (e) {
                console.error("Quiz generation error:", e);
                this.quizMessages.push({
                    role: 'assistant',
                    content: 'Sorry, I had trouble generating that quiz. Let\'s try again!'
                });
                this.quizStep = 'topic';
            } finally {
                this.isGeneratingQuiz = false;
            }
        },
        answerQuestion(idx, answer) {
            const q = this.activeQuiz.questions[idx];
            if (q.answered) return;
            q.userAnswer = answer;
            q.answered = true;
            const correctAnswer = String(q.answer).toLowerCase().trim();
            const userAnswer = String(answer).toLowerCase().trim();
            q.correct = correctAnswer === userAnswer;
        },
        getOptionStyle(q, opt) {
            if (!q.answered) {
                return { background: 'white', border: '1px solid #e5e7eb', color: '#222' };
            }
            const isCorrect = String(opt).toLowerCase().trim() === String(q.answer).toLowerCase().trim();
            const isSelected = String(opt).toLowerCase().trim() === String(q.userAnswer).toLowerCase().trim();
            if (isCorrect) {
                return { background: '#dcfce7', border: '2px solid #22c55e', color: '#15803d' };
            }
            if (isSelected && !isCorrect) {
                return { background: '#fee2e2', border: '2px solid #ef4444', color: '#b91c1c' };
            }
            return { background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#9ca3af' };
        },
        async loadSettings() {
            try {
                if (!this.currentUser?.uid) return;
                const settingsDoc = await getDoc(doc(db, "settings", this.currentUser.uid));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    this.settings = { ...this.settings, ...data.notifications };
                    this.availability = { ...this.availability, ...data.availability };
                }
            } catch (e) {
                console.error("Error loading settings:", e);
            }
        },
        async saveSettings() {
            try {
                if (!this.currentUser?.uid) return;
                await setDoc(doc(db, "settings", this.currentUser.uid), {
                    mentorId: this.currentUser.uid,
                    mentorName: this.currentUser.displayName || 'Mentor',
                    mentorEmail: this.currentUser.email,
                    notifications: this.settings,
                    availability: this.availability,
                    updatedAt: new Date()
                }, { merge: true });
                this.showToastNotification('Settings saved!');
            } catch (e) {
                console.error("Error saving settings:", e);
                this.showToastNotification('Error saving settings');
            }
        },
        async loadNotes() {
            try {
                const q = query(
                    collection(db, "notes"),
                    where("userId", "==", this.currentUser.uid),
                    orderBy("updatedAt", "desc")
                );
                const snap = await getDocs(q);
                this.notes = [];
                snap.forEach(doc => this.notes.push({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error("Error loading notes:", e);
            }
        },
        createNewNote() {
            this.activeNote = null;
            this.noteTitle = 'Untitled';
            this.noteContent = '';
            this.$nextTick(() => {
                const editor = this.$refs.noteEditor;
                if (editor) {
                    editor.innerHTML = '';
                    editor.focus();
                }
            });
        },
        selectNote(note) {
            this.activeNote = note;
            this.noteTitle = note.title;
            this.noteContent = note.content || '';
            this.$nextTick(() => {
                const editor = this.$refs.noteEditor;
                if (editor) {
                    if (this.noteContent && typeof marked !== 'undefined' && !this.noteContent.startsWith('<')) {
                        editor.innerHTML = marked.parse(this.noteContent);
                    } else {
                        editor.innerHTML = this.noteContent || '';
                    }
                }
            });
        },
        handleNoteInput() {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            this.noteContent = editor.innerHTML;
            this.checkBlockShortcuts();
        },
        handleNoteKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const node = sel.anchorNode;
                const block = node.nodeType === 3 ? node.parentElement : node;
                if (block && (block.tagName === 'LI' || block.closest('li'))) return;
                if (block && block.closest('pre')) {
                    e.preventDefault();
                    document.execCommand('insertText', false, '\n');
                    return;
                }
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }
        },
        handleNotePaste(e) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        },
        checkBlockShortcuts() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const node = sel.anchorNode;
            if (!node || node.nodeType !== 3) return;
            const text = node.textContent;
            const blockMap = {
                '# ': 'h1', '## ': 'h2', '### ': 'h3',
                '> ': 'blockquote', '- ': 'ul', '* ': 'ul',
                '1. ': 'ol'
            };
            for (const [prefix, tag] of Object.entries(blockMap)) {
                if (text.startsWith(prefix)) {
                    const remaining = text.slice(prefix.length);
                    const block = node.parentElement;
                    if (tag === 'ul' || tag === 'ol') {
                        node.textContent = remaining;
                        document.execCommand('insertUnorderedList');
                        if (tag === 'ol') {
                            document.execCommand('insertUnorderedList');
                            document.execCommand('insertOrderedList');
                        }
                    } else if (tag === 'blockquote') {
                        node.textContent = remaining;
                        const bq = document.createElement('blockquote');
                        const p = document.createElement('p');
                        p.textContent = remaining;
                        bq.appendChild(p);
                        if (block.tagName === 'DIV' || block.tagName === 'P') {
                            block.replaceWith(bq);
                        } else {
                            const parent = node.parentElement;
                            parent.textContent = '';
                            parent.appendChild(bq);
                        }
                        const range = document.createRange();
                        range.selectNodeContents(p);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        const heading = document.createElement(tag);
                        heading.textContent = remaining;
                        if (block && block !== this.$refs.noteEditor) {
                            block.replaceWith(heading);
                        } else {
                            node.textContent = '';
                            node.parentElement.appendChild(heading);
                        }
                        const range = document.createRange();
                        range.selectNodeContents(heading);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    this.noteContent = this.$refs.noteEditor.innerHTML;
                    return;
                }
            }
            if (text === '---' || text === '***') {
                const block = node.parentElement;
                const hr = document.createElement('hr');
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                if (block && block !== this.$refs.noteEditor) {
                    block.replaceWith(hr);
                    hr.after(p);
                }
                const range = document.createRange();
                range.selectNodeContents(p);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                this.noteContent = this.$refs.noteEditor.innerHTML;
            }
        },
        formatBlock(tag) {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            editor.focus();
            if (tag === 'blockquote') {
                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const node = sel.anchorNode;
                const block = node.nodeType === 3 ? node.parentElement : node;
                if (block.closest('blockquote')) {
                    document.execCommand('outdent');
                } else {
                    const bq = document.createElement('blockquote');
                    const p = document.createElement('p');
                    p.textContent = block.textContent;
                    bq.appendChild(p);
                    block.replaceWith(bq);
                    const range = document.createRange();
                    range.selectNodeContents(p);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else {
                document.execCommand('formatBlock', false, tag);
            }
            this.noteContent = editor.innerHTML;
        },
        formatInline(type) {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            editor.focus();
            if (type === 'bold') document.execCommand('bold');
            else if (type === 'italic') document.execCommand('italic');
            else if (type === 'strikethrough') document.execCommand('strikeThrough');
            else if (type === 'code') {
                const sel = window.getSelection();
                if (sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    const code = document.createElement('code');
                    if (range.collapsed) {
                        code.textContent = 'code';
                        range.insertNode(code);
                        range.selectNodeContents(code);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        range.surroundContents(code);
                    }
                }
            }
            this.noteContent = editor.innerHTML;
        },
        formatList(type) {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            editor.focus();
            if (type === 'ul') document.execCommand('insertUnorderedList');
            else document.execCommand('insertOrderedList');
            this.noteContent = editor.innerHTML;
        },
        insertDivider() {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            editor.focus();
            document.execCommand('insertHTML', false, '<hr><p><br></p>');
            this.noteContent = editor.innerHTML;
        },
        insertCodeBlock() {
            const editor = this.$refs.noteEditor;
            if (!editor) return;
            editor.focus();
            document.execCommand('insertHTML', false, '<pre><code>code here</code></pre><p><br></p>');
            this.noteContent = editor.innerHTML;
        },
        async saveNote() {
            if (!this.noteContent.trim() && !this.noteTitle.trim()) return;
            this.isNoteSaving = true;
            try {
                if (this.activeNote) {
                    await updateDoc(doc(db, "notes", this.activeNote.id), {
                        title: this.noteTitle,
                        content: this.noteContent,
                        updatedAt: new Date()
                    });
                } else {
                    const docRef = await addDoc(collection(db, "notes"), {
                        title: this.noteTitle,
                        content: this.noteContent,
                        userId: this.currentUser.uid,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    this.activeNote = { id: docRef.id, title: this.noteTitle, content: this.noteContent };
                }
                this.loadNotes();
                this.showToastNotification('Note saved!');
            } catch (e) {
                console.error("Error saving note:", e);
                this.showToastNotification('Error saving note');
            }
            this.isNoteSaving = false;
        },
        deleteNote(noteId) {
            this.showConfirm('Delete Note', 'Are you sure you want to delete this note?', async () => {
                try {
                    await deleteDoc(doc(db, "notes", noteId));
                    if (this.activeNote?.id === noteId) {
                        this.activeNote = null;
                        this.noteTitle = 'Untitled';
                        this.noteContent = '';
                    }
                    this.loadNotes();
                    this.showToastNotification('Note deleted');
                } catch (e) {
                    console.error("Error deleting note:", e);
                }
            });
        },
        redrawAll() { },
        animate() {
            if (this.activeTab !== 'whiteboard') {
                requestAnimationFrame(() => this.animate());
                return;
            }
            const ctx = this.ctx;
            if (!ctx) {
                requestAnimationFrame(() => this.animate());
                return;
            }
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.paths.forEach(path => {
                ctx.globalAlpha = path.opacity || 1;
                ctx.beginPath();
                ctx.strokeStyle = path.color;
                ctx.lineWidth = path.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (path.isEraser) return;
                ctx.globalCompositeOperation = 'source-over';
                if (path.selected) {
                    ctx.shadowColor = '#6366f1';
                    ctx.shadowBlur = 8;
                } else {
                    ctx.shadowBlur = 0;
                }
                if (path.type === 'shape') {
                    const start = path.points[0];
                    const end = path.points[path.points.length - 1];
                    const w = end.x - start.x;
                    const h = end.y - start.y;
                    if (path.subType === 'rect') {
                        ctx.strokeRect(start.x, start.y, w, h);
                    } else if (path.subType === 'circle') {
                        ctx.beginPath();
                        const r = Math.sqrt(w * w + h * h);
                        ctx.arc(start.x, start.y, r, 0, 2 * Math.PI);
                        ctx.stroke();
                    } else if (path.subType === 'diamond') {
                        const cx = start.x + w / 2;
                        const cy = start.y + h / 2;
                        ctx.beginPath();
                        ctx.moveTo(cx, start.y);
                        ctx.lineTo(end.x, cy);
                        ctx.lineTo(cx, end.y);
                        ctx.lineTo(start.x, cy);
                        ctx.closePath();
                        ctx.stroke();
                    } else if (path.subType === 'arrow') {
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();
                        const angle = Math.atan2(end.y - start.y, end.x - start.x);
                        const headLen = 15;
                        ctx.beginPath();
                        ctx.moveTo(end.x, end.y);
                        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
                        ctx.moveTo(end.x, end.y);
                        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
                        ctx.stroke();
                    } else if (path.subType === 'line') {
                        ctx.moveTo(start.x, start.y);
                        ctx.lineTo(end.x, end.y);
                        ctx.stroke();
                    }
                } else {
                    if (path.points.length > 0) {
                        ctx.moveTo(path.points[0].x, path.points[0].y);
                        for (let i = 1; i < path.points.length; i++) {
                            ctx.lineTo(path.points[i].x, path.points[i].y);
                        }
                        ctx.stroke();
                    }
                }
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 0;
            });
            if (this.wbTool === 'laser' && this.laserTrail.length > 0) {
                const now = Date.now();
                ctx.save();
                // Draw trail with fading opacity
                for (let i = 0; i < this.laserTrail.length; i++) {
                    const pt = this.laserTrail[i];
                    const age = now - pt.time;
                    const maxAge = 800;
                    if (age > maxAge) continue;
                    const alpha = 1 - (age / maxAge);
                    const radius = 3 + (alpha * 3);
                    // Draw connecting line to next point
                    if (i < this.laserTrail.length - 1) {
                        const next = this.laserTrail[i + 1];
                        ctx.beginPath();
                        ctx.moveTo(pt.x, pt.y);
                        ctx.lineTo(next.x, next.y);
                        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
                        ctx.lineWidth = radius * 1.5;
                        ctx.lineCap = 'round';
                        ctx.stroke();
                    }
                    // Draw point
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                    ctx.fill();
                }
                // Draw main laser dot
                if (this.laserPoint) {
                    ctx.beginPath();
                    ctx.arc(this.laserPoint.x, this.laserPoint.y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 20;
                    ctx.fill();
                }
                ctx.restore();
                // Clean up old trail points
                this.laserTrail = this.laserTrail.filter(pt => (now - pt.time) < 800);
            }
            requestAnimationFrame(() => this.animate());
        }
    }
}).mount('#app');
