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
            assignedMentors: [],
            sessions: [],
            pendingBookings: [],
            chats: [],
            activeChat: null,
            activeMessages: [],
            newMessage: '',
            showVideoModal: false,
            agoraClient: null,
            localAudioTrack: null,
            localVideoTrack: null,
            videoMuted: false,
            audioMuted: false,
            remoteUser: null,
            currentChannel: '',
            wbTool: 'pen',
            wbColor: '#1e1e1e',
            wbSize: 4,
            showOptionsPanel: false,
            isDrawing: false,
            paths: [],
            currentPath: null,
            canvas: null,
            ctx: null,
            aiSidebarTab: 'chats',
            messages: [],
            aiInput: '',
            isAiThinking: false,
            chatHistory: [],
            currentToolUsed: null,
            quizMessages: [],
            quizInput: '',
            quizStep: 'topic',
            quizTopic: '',
            isGeneratingQuiz: false,
            activeQuiz: null,
            savedQuizzes: [],
            assignedQuizzes: [],
            callTranscripts: [],
            notes: [],
            activeNote: null,
            noteTitle: '',
            noteContent: '',
            saveTimeout: null,
            chatSearch: '',
            showConfirmModal: false,
            confirmTitle: '',
            confirmMessage: '',
            confirmBtnText: 'Delete',
            confirmCallback: null,
            settings: {
                sessionReminders: true,
                messageAlerts: true,
                quizAlerts: true,
                emailNotifications: true
            },
            profileData: {
                displayName: '',
                grade: '12'
            },
            showBookingModal: false,
            bookingData: {
                mentorId: '',
                subject: '',
                date: '',
                time: '',
                duration: 60,
                notes: ''
            },
            datePicker: null,
            timePicker: null,
            mentorAvailability: null,
            showToast: false,
            toastMessage: '',
            dropdowns: {}
        };
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
        userInitials() {
            if (!this.currentUser) return 'ST';
            const name = this.currentUser.displayName || this.currentUser.name || this.currentUser.email || '';
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase() || 'ST';
        },
        todaysSessions() {
            const today = new Date().toISOString().split('T')[0];
            return this.sessions.filter(s => s.date === today);
        },
        allSessions() {
            const now = new Date();
            return this.sessions
                .filter(s => new Date(s.date) >= new Date(now.toISOString().split('T')[0]))
                .sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime));
        },
        quizProgress() {
            if (!this.activeQuiz || !this.activeQuiz.questions) return 0;
            const answered = this.activeQuiz.questions.filter(q => q.answered).length;
            return (answered / this.activeQuiz.questions.length) * 100;
        },
        availableTimeSlots() {
            const allSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];
            const selectedDate = this.bookingData.date;
            if (!selectedDate) return allSlots.map(t => ({ time: t, available: true }));
            const bookedTimes = this.sessions
                .filter(s => s.date === selectedDate && s.status !== 'cancelled')
                .map(s => s.startTime || s.time);
            return allSlots.map(t => ({
                time: t,
                available: !bookedTimes.includes(t)
            }));
        },
        renderedNote() {
            return '';
        },
        filteredChats() {
            if (!this.chatSearch.trim()) return this.chats;
            const q = this.chatSearch.toLowerCase();
            return this.chats.filter(chat => {
                const name = (chat.mentorName || chat.studentName || '').toLowerCase();
                const msg = (chat.lastMessage || '').toLowerCase();
                return name.includes(q) || msg.includes(q);
            });
        }
    },
    mounted() {
        onAuthStateChanged(auth, async (user) => {
            if (this.authProcessed) return;
            this.authProcessed = true;
            if (user) {
                this.currentUser = user;
                this.profileData.displayName = user.displayName || '';
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role && userData.role !== 'mentee' && userData.role !== 'student') {
                        window.location.href = '/mentor/dashboard/';
                        return;
                    }
                }
                this.initializeData();
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
            }
        });
    },
    methods: {
        initializeData() {
            this.loadAssignedMentors();
            this.loadSessions();
            this.loadPendingBookings();
            this.loadChats();
            this.loadAssignedQuizzes();
            this.loadNotes();
            this.loadSettings();
            this.loadCallTranscripts();
        },
        loadCallTranscripts() {
            const transcriptsRef = ref(rtdb, 'callTranscripts');
            onValue(transcriptsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const userName = this.currentUser?.displayName || this.currentUser?.name || '';
                    this.callTranscripts = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value, expanded: false }))
                        .filter(ct => ct.menteeName === userName || ct.mentorName === userName)
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
        formatGrade(val) {
            const map = { '9': 'Grade 9', '10': 'Grade 10', '11': 'Grade 11', '12': 'Grade 12', 'college': 'College' };
            return map[val] || 'Select grade';
        },
        async generateSummary(ct) {
            if (ct.summary || ct.generatingSummary) return;
            ct.generatingSummary = true;
            try {
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: 'You are a helpful study assistant. Summarize the following tutoring session transcript into 3-5 concise bullet points. Do not mention "agentic" or "technical details".' },
                            { role: 'user', content: ct.transcript }
                        ]
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    ct.summary = data.choices?.[0]?.message?.content || '';
                }
            } catch (e) {
                console.error("Summary gen failed", e);
            }
            ct.generatingSummary = false;
        },
        analyzeSession(ct) {
            // Switch to AI tab
            this.activeTab = 'ai';

            // Start new chat
            this.startNewChat();

            // Seed with transcript context (hidden system message)
            this.messages.push({
                role: 'system',
                content: `You are analyzing a transcript of a tutoring session for ${this.currentUser?.displayName || 'the student'}. 
TRANSCRIPT:
${ct.transcript}

The user will ask questions about this meeting. Answer helpfully and concisely.
- Do NOT list your tools or capabilities.
- Do NOT upsell features.
- If asked to create a note, just do it.`
            });

            // Proactive AI greeting
            this.messages.push({
                role: 'assistant',
                content: "I've reviewed the transcript for this session. What would you like to know about the meeting?"
            });
        },
        async logout() {
            try {
                await signOut(auth);
                window.location.href = '/';
            } catch (e) {
                console.error("Error signing out:", e);
                this.showToastNotification('Failed to sign out');
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
            return new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
        formatSessionTime(time) {
            if (!time) return '';
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        },
        formatSessionDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (date.toDateString() === today.toDateString()) return 'Today';
            if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        },
        showToastNotification(message) {
            this.toastMessage = message;
            this.showToast = true;
            setTimeout(() => { this.showToast = false; }, 3000);
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
        getMentorInitials(mentor) {
            const name = mentor.displayName || mentor.name || '';
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase() || 'MT';
        },
        async loadAssignedMentors() {
            try {
                const userEmail = this.currentUser.email?.toLowerCase().trim();
                const assignmentsRef = collection(db, 'assignments');
                const q = query(assignmentsRef, where('studentEmail', '==', userEmail));
                onSnapshot(q, async (snapshot) => {
                    if (snapshot.docs.length > 0) {
                        const mentors = [];
                        for (const docSnap of snapshot.docs) {
                            const assignment = docSnap.data();
                            const mentorDoc = await getDoc(doc(db, 'users', assignment.mentorId));
                            if (mentorDoc.exists()) {
                                mentors.push({ id: mentorDoc.id, ...mentorDoc.data() });
                            } else {
                                mentors.push({
                                    id: assignment.mentorId,
                                    displayName: assignment.mentorName,
                                    email: assignment.mentorEmail,
                                    subjects: ['General']
                                });
                            }
                        }
                        this.assignedMentors = mentors;
                    } else {
                        this.assignedMentors = [];
                    }
                });
            } catch (e) {
                console.error("Error loading mentors:", e);
                this.assignedMentors = [];
            }
        },
        loadSessions() {
            const sessionsRef = ref(rtdb, 'sessions');
            onValue(sessionsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.sessions = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(session => session.studentId === this.currentUser.uid || session.participants?.includes(this.currentUser.uid));
                } else {
                    this.sessions = [];
                }
            });
        },
        loadPendingBookings() {
            const bookingsRef = ref(rtdb, 'bookings');
            onValue(bookingsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.pendingBookings = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(b => b.studentId === this.currentUser.uid && b.status === 'pending');
                } else {
                    this.pendingBookings = [];
                }
            });
        },
        async submitBooking() {
            if (!this.bookingData.mentorId || !this.bookingData.subject || !this.bookingData.date || !this.bookingData.time) {
                this.showToastNotification('Please fill in all required fields');
                return;
            }
            const mentor = this.assignedMentors.find(m => m.id === this.bookingData.mentorId);
            const bookingId = 'booking_' + Date.now();
            try {
                await set(ref(rtdb, `bookings/${bookingId}`), {
                    studentId: this.currentUser.uid,
                    studentName: this.currentUser.displayName || this.currentUser.name || 'Student',
                    studentEmail: this.currentUser.email,
                    mentorId: this.bookingData.mentorId,
                    mentorName: mentor?.displayName || mentor?.name || 'Mentor',
                    mentorEmail: mentor?.email,
                    subject: this.bookingData.subject,
                    date: this.bookingData.date,
                    time: this.bookingData.time,
                    duration: this.bookingData.duration,
                    notes: this.bookingData.notes,
                    status: 'pending',
                    createdAt: Date.now()
                });
                this.showBookingModal = false;
                this.bookingData = { mentorId: '', subject: '', date: '', time: '', duration: 60, notes: '' };
                this.showToastNotification('Session request sent!');
            } catch (e) {
                console.error("Error submitting booking:", e);
                this.showToastNotification('Failed to send request');
            }
        },
        openBookingModal() {
            this.bookingData = { mentorId: '', subject: '', date: '', time: '', duration: 60, notes: '' };
            this.mentorAvailability = null;
            this.showBookingModal = true;
        },
        async loadMentorAvailability() {
            this.bookingData.date = '';
            this.bookingData.time = '';
            this.mentorAvailability = null;
            if (!this.bookingData.mentorId) return;
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', this.bookingData.mentorId));
                if (settingsDoc.exists()) {
                    this.mentorAvailability = settingsDoc.data().availability || null;
                }
            } catch (e) {
                console.error('Error loading mentor availability:', e);
            }
            this.initBookingDatePicker();
        },
        initBookingDatePicker() {
            this.$nextTick(() => {
                if (this.datePicker) { this.datePicker.destroy(); this.datePicker = null; }
                if (!this.$refs.bookingDatePicker) return;
                const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
                const disabledDays = [];
                if (this.mentorAvailability) {
                    for (const [day, config] of Object.entries(this.mentorAvailability)) {
                        if (!config.enabled && dayMap[day] !== undefined) {
                            disabledDays.push(dayMap[day]);
                        }
                    }
                }
                this.datePicker = flatpickr(this.$refs.bookingDatePicker, {
                    dateFormat: 'Y-m-d',
                    minDate: 'today',
                    altInput: true,
                    altFormat: 'F j, Y',
                    disable: disabledDays.length > 0 ? [function (date) { return disabledDays.includes(date.getDay()); }] : [],
                    onChange: (dates, dateStr) => {
                        this.bookingData.date = dateStr;
                        this.bookingData.time = '';
                    }
                });
            });
        },
        viewMentorAvailability(mentor) {
            this.bookingData = { mentorId: mentor.id, subject: '', date: '', time: '', duration: 60, notes: '' };
            this.mentorAvailability = null;
            this.showBookingModal = true;
            this.loadMentorAvailability();
        },
        joinSession(session) {
            const channel = `session_${session.id}`;
            const menteeName = this.currentUser.displayName || this.currentUser.name || 'Student';
            const mentorName = session.mentorName || '';
            const params = new URLSearchParams({
                channel,
                mentor: mentorName,
                mentee: menteeName,
                role: 'mentee'
            });
            window.open(`/tools/call?${params.toString()}`, '_blank');
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
                            const byEmail = chat.studentEmail === userEmail;
                            return byUid || byEmail;
                        })
                        .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
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
            if (!this.newMessage.trim() || !this.activeChat) return;
            const chatId = this.activeChat.id;
            push(ref(rtdb, `messages/${chatId}`), {
                text: this.newMessage,
                senderId: this.currentUser.uid,
                timestamp: serverTimestamp(),
                read: false
            });
            update(ref(rtdb, `chats/${chatId}`), {
                lastMessage: this.newMessage,
                lastMessageTime: serverTimestamp()
            });
            this.newMessage = '';
        },
        startStrictChat(mentor) {
            const mentorId = mentor.id;
            const mentorEmail = mentor.email;
            const existingChat = this.chats.find(c => {
                const byUid = c.participants && c.participants.includes(mentorId);
                const byEmail = c.mentorEmail === mentorEmail;
                return byUid || byEmail;
            });
            if (existingChat) {
                this.activeTab = 'messages';
                this.selectChat(existingChat);
            } else {
                const chatId = 'chat_' + this.currentUser.uid + '_' + mentorId;
                set(ref(rtdb, `chats/${chatId}`), {
                    participants: [this.currentUser.uid, mentorId],
                    mentorName: mentor.displayName || mentor.name,
                    mentorEmail: mentor.email,
                    studentName: this.currentUser.displayName || this.currentUser.name || 'Student',
                    studentEmail: this.currentUser.email,
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
        startCall() {
            if (!this.activeChat) {
                this.showToastNotification('Please select a chat first');
                return;
            }
            const channel = `chat_${this.activeChat.id}`;
            const menteeName = this.currentUser.displayName || this.currentUser.name || 'Student';
            const mentorName = this.activeChat.mentorName || '';
            const params = new URLSearchParams({
                channel,
                mentor: mentorName,
                mentee: menteeName,
                role: 'mentee'
            });
            window.open(`/tools/call?${params.toString()}`, '_blank');
        },
        async initializeAgora(channelName) {
            try {
                this.agoraClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
                this.agoraClient.on("user-published", async (user, mediaType) => {
                    await this.agoraClient.subscribe(user, mediaType);
                    if (mediaType === "video") {
                        this.remoteUser = user;
                        user.videoTrack.play("remote-video");
                    }
                    if (mediaType === "audio") {
                        user.audioTrack.play();
                    }
                });
                this.agoraClient.on("user-unpublished", (user) => {
                    if (this.remoteUser === user) this.remoteUser = null;
                });
                const uid = Math.floor(Math.random() * 10000);
                const response = await fetch('/api/agora-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ channelName, uid })
                });
                const data = await response.json();
                if (!this.showVideoModal) return;
                await this.agoraClient.join(data.appID, channelName, data.token, uid);
                if (!this.showVideoModal) {
                    this.agoraClient.leave();
                    return;
                }
                [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                this.localVideoTrack.play("local-video");
                await this.agoraClient.publish([this.localAudioTrack, this.localVideoTrack]);
            } catch (error) {
                console.error("Agora Error:", error);
                this.showToastNotification("Call failed: " + error.message);
                this.endCall();
            }
        },
        async endCall() {
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
            } catch (e) {
                console.error("Error ending call:", e);
            } finally {
                this.showVideoModal = false;
                this.remoteUser = null;
                this.audioMuted = false;
                this.videoMuted = false;
            }
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
        detectToolUsage(prompt) {
            const lowerPrompt = prompt.toLowerCase();
            if (/\b(book|schedule|request).*(session|meeting|call|tutoring)/i.test(prompt)) {
                return { tool: 'Book Session', icon: 'ph-calendar-plus', agentic: true };
            }
            if (/\b(message|tell|send|notify).*(mentor|teacher|tutor)/i.test(prompt)) {
                return { tool: 'Message Mentor', icon: 'ph-paper-plane-tilt', agentic: true };
            }
            if (/\b(quiz|test me|questions about|practice.*questions)/i.test(prompt)) {
                return { tool: 'Quiz Generator', icon: 'ph-exam', agentic: true };
            }
            if (/\b(save|create|make|write|add).*(note|notes)/i.test(prompt)) {
                // If special instructions about content, treat as agentic
                if (prompt.length > 20) return { tool: 'Create Note', icon: 'ph-note-pencil', agentic: true };
                return { tool: 'Create Note', icon: 'ph-note-pencil', agentic: true };
            }
            if (/\b(when|what|show|view).*(session|schedule|class|next)/i.test(prompt)) {
                return { tool: 'View Schedule', icon: 'ph-calendar', agentic: false };
            }
            if (/\b(my mentor|who is my|about.*mentor)/i.test(prompt)) {
                return { tool: 'Mentor Info', icon: 'ph-user', agentic: false };
            }
            return { tool: null, icon: null, agentic: false };
        },
        async executeAgenticAction(tool, prompt) {
            if (tool === 'Create Note') {
                try {
                    const noteRes = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [
                                { role: 'system', content: 'You are a note-taking assistant. Generate a structured note based on the user request. Return JSON with "title" and "content" fields. Content should be detailed HTML.' },
                                { role: 'user', content: prompt }
                            ]
                        })
                    });
                    const noteData = await noteRes.json();
                    let contentStr = noteData.choices?.[0]?.message?.content || '';
                    let title = 'New Note';
                    let body = contentStr;
                    try {
                        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            title = parsed.title || title;
                            body = parsed.content || body;
                        } else {
                            const lines = contentStr.split('\n');
                            title = lines[0].replace(/^#+\s*/, '').substring(0, 50);
                            body = contentStr;
                        }
                    } catch (e) { }

                    const noteId = Date.now().toString();
                    await set(ref(rtdb, `notes/${this.currentUser.uid}/${noteId}`), {
                        id: noteId,
                        title: title,
                        content: body,
                        date: new Date().toISOString(),
                        tags: []
                    });
                    this.loadNotes();
                    return { success: true, message: `I've created a note titled "**${title}**". Check your Notes tab.` };
                } catch (e) {
                    return { success: false, message: "Failed to create note." };
                }
            }
            switch (tool) {
                case 'Book Session': {
                    if (this.assignedMentors.length === 0) {
                        return { success: false, message: "You don't have any assigned mentors yet. Please contact admin for mentor assignment." };
                    }
                    const mentor = this.assignedMentors[0];
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
                    const subjectMatch = prompt.match(/(?:for|about|on)\s+(\w+(?:\s+\w+)?)/i);
                    const subject = subjectMatch ? subjectMatch[1] : 'General Study Session';
                    const bookingId = 'booking_' + Date.now();
                    try {
                        await set(ref(rtdb, `bookings/${bookingId}`), {
                            studentId: this.currentUser.uid,
                            studentName: this.currentUser.displayName || this.currentUser.name || 'Student',
                            studentEmail: this.currentUser.email,
                            mentorId: mentor.id,
                            mentorName: mentor.displayName || mentor.name || 'Mentor',
                            mentorEmail: mentor.email,
                            subject: subject,
                            date: dateStr,
                            time: time,
                            notes: `Booked via AI Assistant: "${prompt}"`,
                            status: 'pending',
                            createdAt: Date.now()
                        });
                        return {
                            success: true,
                            message: `I've sent a session request to **${mentor.displayName || mentor.name}** for **${subject}** on **${new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}** at **${this.formatSessionTime(time)}**.\n\nYour mentor will confirm the booking soon. You can check the status in the Schedule tab.`
                        };
                    } catch (e) {
                        console.error("Booking error:", e);
                        return { success: false, message: "Sorry, I couldn't create the booking. Please try again or use the Book Session button." };
                    }
                }
                case 'Message Mentor': {
                    if (this.assignedMentors.length === 0) {
                        return { success: false, message: "You don't have any assigned mentors to message." };
                    }
                    const mentor = this.assignedMentors[0];
                    const messageMatch = prompt.match(/(?:tell|message|send|notify).*(?:mentor|teacher|tutor)\s+(?:that\s+)?(.+)/i);
                    const messageContent = messageMatch ? messageMatch[1] : prompt;
                    const chatId = 'chat_' + this.currentUser.uid + '_' + mentor.id;
                    try {
                        const chatRef = ref(rtdb, `chats/${chatId}`);
                        await update(chatRef, {
                            participants: [this.currentUser.uid, mentor.id],
                            mentorId: mentor.id,
                            mentorName: mentor.displayName || mentor.name,
                            mentorEmail: mentor.email,
                            studentId: this.currentUser.uid,
                            studentName: this.currentUser.displayName || this.currentUser.name || 'Student',
                            studentEmail: this.currentUser.email,
                            lastMessage: messageContent,
                            lastMessageTime: serverTimestamp(),
                            lastSenderId: this.currentUser.uid
                        });
                        await push(ref(rtdb, `messages/${chatId}`), {
                            text: messageContent,
                            senderId: this.currentUser.uid,
                            senderName: this.currentUser.displayName || this.currentUser.name || 'Student',
                            timestamp: serverTimestamp(),
                            read: false
                        });
                        return {
                            success: true,
                            message: `I've sent your message to **${mentor.displayName || mentor.name}**:\n\n> "${messageContent}"\n\nYou can continue the conversation in the Messages tab.`
                        };
                    } catch (e) {
                        console.error("Message error:", e);
                        return { success: false, message: "Sorry, I couldn't send the message. Please try again." };
                    }
                }
                case 'Create Note': {
                    const titleMatch = prompt.match(/(?:note|notes)\s+(?:about|on|for)\s+(.+)/i);
                    const title = titleMatch ? titleMatch[1].substring(0, 50) : 'AI Generated Note';
                    const noteId = 'note_' + Date.now();
                    try {
                        await set(ref(rtdb, `notes/${this.currentUser.uid}/${noteId}`), {
                            title: title,
                            content: `Note created via AI Assistant.\n\nTopic: ${title}\n\nAdd your notes here...`,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                        return {
                            success: true,
                            message: `I've created a new note titled "**${title}**". You can find it in the Study Notes tab to add more content.`
                        };
                    } catch (e) {
                        console.error("Note creation error:", e);
                        return { success: false, message: "Sorry, I couldn't create the note. Please try again." };
                    }
                }
                case 'View Schedule': {
                    const upcoming = this.allSessions.slice(0, 5);
                    if (upcoming.length === 0) {
                        return { success: true, message: "You don't have any upcoming sessions scheduled. Would you like me to help you book one?" };
                    }
                    let scheduleText = "Here are your upcoming sessions:\n\n";
                    upcoming.forEach(s => {
                        scheduleText += `- **${this.formatSessionDate(s.date)}** at **${this.formatSessionTime(s.startTime)}** - ${s.subject} with ${s.mentorName}\n`;
                    });
                    return { success: true, message: scheduleText };
                }
                case 'Mentor Info': {
                    if (this.assignedMentors.length === 0) {
                        return { success: true, message: "You don't have any assigned mentors yet. Please contact admin for mentor assignment." };
                    }
                    let mentorText = "Your assigned mentors:\n\n";
                    this.assignedMentors.forEach(m => {
                        mentorText += `- **${m.displayName || m.name}** - ${m.subjects?.join(', ') || m.subject || 'General'}\n`;
                    });
                    return { success: true, message: mentorText };
                }
                default:
                    return { success: false, message: "I'm not sure how to help with that." };
            }
        },
        async generateQuizInline(topic) {
            const prompt = `Generate an EDUCATIONAL quiz with 5 mixed questions (multiple choice, fill in blank, true/false) about "${topic}".
Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "title": "Quiz: ${topic}",
  "questions": [
    {"type": "mcq", "question": "Question text?", "options": ["A", "B", "C", "D"], "answer": "Correct option text", "explanation": "Brief explanation"},
    {"type": "fill", "question": "The ____ is important.", "answer": "answer word", "explanation": "Brief explanation"},
    {"type": "truefalse", "question": "Statement to evaluate", "answer": "True", "explanation": "Brief explanation"}
  ]
}`;
            try {
                const response = await fetch("/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: prompt }],
                        stream: false
                    })
                });
                const data = await response.json();
                let quizText = data.choices[0].message.content;
                quizText = quizText.replace(/```json\n?|```/g, '').trim();
                const quizData = JSON.parse(quizText);
                return {
                    title: quizData.title || `Quiz: ${topic}`,
                    questions: quizData.questions.map(q => ({
                        ...q,
                        type: q.type || 'mcq',
                        answered: false,
                        correct: false,
                        selected: null,
                        userInput: ''
                    }))
                };
            } catch (e) {
                console.error("Quiz generation error:", e);
                return null;
            }
        },
        async sendAiMessage() {
            if (!this.aiInput.trim()) return;
            const input = this.aiInput;
            const isImageRequest = /\b(generate|create|draw|make|show me|give me)\b.*(image|picture|photo|illustration|art|drawing|diagram|visual)/i.test(input);
            const isQuizRequest = /\b(quiz|test me|questions about|practice.*questions)\b/i.test(input);
            const userMsg = { role: 'user', content: input };
            this.messages.push(userMsg);
            this.isAiThinking = true;
            this.aiInput = '';
            const toolDetected = this.detectToolUsage(input);
            if (toolDetected) {
                this.currentToolUsed = toolDetected.tool;
            }
            if (isImageRequest) {
                this.currentToolUsed = 'Image Generation';
            }
            const aiMsg = { role: 'assistant', content: '', image: null, quiz: null };
            this.messages.push(aiMsg);
            const msgIndex = this.messages.length - 1;
            try {
                if (toolDetected && toolDetected.agentic && toolDetected.tool !== 'Quiz Generator') {
                    const result = await this.executeAgenticAction(toolDetected.tool, input);
                    this.messages[msgIndex].content = result.message;
                    this.messages[msgIndex].actionTaken = result.success;
                } else if (isQuizRequest) {
                    const topicMatch = input.match(/(?:quiz|test me|questions about|practice.*questions)\s*(?:on|about|for)?\s*(.+)/i);
                    const topic = topicMatch ? topicMatch[1].trim() : 'General Knowledge';
                    this.messages[msgIndex].content = `Generating a quiz on **${topic}**...`;
                    const quiz = await this.generateQuizInline(topic);
                    if (quiz) {
                        this.messages[msgIndex].content = `Here's your quiz on **${topic}**! Answer the questions below:`;
                        this.messages[msgIndex].quiz = quiz;
                        this.activeQuiz = quiz;
                        this.aiSidebarTab = 'quizzes';
                    } else {
                        this.messages[msgIndex].content = `I had trouble generating a quiz on "${topic}". Let me help you study instead:\n\n**${topic}** is an interesting subject! What specific aspect would you like to learn about?`;
                    }
                } else if (isImageRequest) {
                    const systemPrompt = 'You are an AI that generates educational images. Create the image as requested. Only generate educational, family-friendly content.';
                    const apiMessages = [
                        { role: 'system', content: systemPrompt },
                        ...this.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
                    ];
                    const response = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            generateImage: true,
                            stream: false,
                            messages: apiMessages
                        })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content || '';
                    let imageUrl = null;
                    if (data.choices?.[0]?.message?.images?.length > 0) {
                        imageUrl = data.choices[0].message.images[0].image_url?.url || data.choices[0].message.images[0].url;
                    }
                    const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
                    if (base64Match) {
                        imageUrl = base64Match[0];
                    }
                    this.messages[msgIndex].content = content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/, '').trim() || 'Here is the generated image:';
                    this.messages[msgIndex].image = imageUrl;
                } else {
                    const scheduleContext = this.allSessions.slice(0, 3).map(s => `- ${this.formatSessionDate(s.date)} at ${this.formatSessionTime(s.startTime)}: ${s.subject} with ${s.mentorName}`).join('\n');
                    const mentorNames = this.assignedMentors.map(m => m.displayName || m.name).join(', ');
                    const systemPrompt = `You are a helpful AI study assistant for ${this.currentUser?.displayName || 'the student'} in India. 
**Student's Context:**
- Mentors: ${mentorNames || 'No mentors assigned'}
- Upcoming Sessions: ${scheduleContext || 'None scheduled'}

**Guidelines:**
- Assist **${this.currentUser?.displayName || 'the student'}** directly.
- **Do NOT** list your capabilities or tools unless explicitly asked.
- **Do NOT** upsell your features.
- If asked to create a note, just do it.

**Available Tools (Implicit):**
- Create Note
- View Schedule
- View Info

**Rules:**
- Use markdown formatting
- Use LaTeX for math ($...$ inline, $$...$$ block)
- Do NOT use emojis
- Be encouraging and supportive
- Use INR (₹) for currency`;
                    const apiMessages = [
                        { role: 'system', content: systemPrompt },
                        ...this.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
                    ];
                    const response = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            stream: true,
                            messages: apiMessages
                        })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
                                        this.$nextTick(() => {
                                            const win = this.$refs.chatWindow;
                                            if (win) win.scrollTop = win.scrollHeight;
                                        });
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                this.messages[msgIndex].content = 'Sorry, I am having trouble connecting. Please try again.';
            } finally {
                this.isAiThinking = false;
                this.currentToolUsed = null;
                this.$nextTick(() => {
                    const win = this.$refs.chatWindow;
                    if (win) win.scrollTop = win.scrollHeight;
                });
            }
        },
        startNewChat() {
            if (this.messages.length > 0) {
                const title = this.messages[0]?.content?.substring(0, 30) + '...' || 'Chat';
                this.chatHistory.unshift({
                    id: Date.now(),
                    title: title,
                    messages: [...this.messages]
                });
            }
            this.messages = [];
        },
        loadChat(chat) {
            this.messages = chat.messages || [];
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
            let html = typeof marked !== 'undefined' ? marked.parse(processed) : processed;
            latexBlocks.forEach((rendered, i) => {
                html = html.replace(`%%LATEX_BLOCK_${i}%%`, rendered);
                html = html.replace(`%%LATEX_INLINE_${i}%%`, rendered);
            });
            html = html.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
            return html;
        },
        loadAssignedQuizzes() {
            const quizzesRef = ref(rtdb, 'assignedQuizzes');
            onValue(quizzesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.assignedQuizzes = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .filter(q => q.studentId === this.currentUser.uid && !q.completed);
                } else {
                    this.assignedQuizzes = [];
                }
            });
        },
        startAssignedQuiz(quiz) {
            const questions = typeof quiz.questions === 'string' ? JSON.parse(quiz.questions) : quiz.questions;
            this.activeQuiz = {
                ...quiz,
                questions: questions.map(q => ({ ...q, type: q.type || 'mcq', answered: false, correct: false, selected: null, userInput: '' }))
            };
            this.activeTab = 'ai';
            this.aiSidebarTab = 'quizzes';
        },
        loadSavedQuiz(quiz) {
            this.activeQuiz = quiz;
        },
        answerQuestion(idx, answer) {
            const q = this.activeQuiz.questions[idx];
            if (!answer || q.answered) return;
            q.selected = answer;
            q.answered = true;
            const userAnswer = String(answer).toLowerCase().trim();
            const correctAnswer = String(q.answer).toLowerCase().trim();
            q.correct = userAnswer === correctAnswer;
        },
        getOptionStyle(q, opt) {
            if (!q.answered) return { background: 'white', border: '1px solid #e5e7eb' };
            const optLower = String(opt).toLowerCase().trim();
            const answerLower = String(q.answer).toLowerCase().trim();
            const selectedLower = String(q.selected).toLowerCase().trim();
            if (optLower === answerLower) return { background: '#dcfce7', border: '2px solid #22c55e', color: '#15803d' };
            if (optLower === selectedLower && !q.correct) return { background: '#fee2e2', border: '2px solid #ef4444', color: '#b91c1c' };
            return { background: '#f5f5f5', border: '1px solid #e5e7eb', color: '#9ca3af' };
        },
        async finishQuiz() {
            if (this.activeQuiz && this.activeQuiz.id) {
                const answered = this.activeQuiz.questions.filter(q => q.answered).length;
                const correct = this.activeQuiz.questions.filter(q => q.correct).length;
                try {
                    await update(ref(rtdb, `assignedQuizzes/${this.activeQuiz.id}`), {
                        completed: true,
                        completedAt: serverTimestamp(),
                        score: correct,
                        total: this.activeQuiz.questions.length
                    });
                    this.showToastNotification(`Quiz completed! Score: ${correct}/${this.activeQuiz.questions.length}`);
                } catch (e) {
                    console.error("Error saving quiz result:", e);
                }
            }
            this.activeQuiz = null;
        },
        async sendQuizMessage() {
            if (!this.quizInput.trim()) return;
            const userInput = this.quizInput.trim();
            this.quizMessages.push({ role: 'user', content: userInput });
            this.quizInput = '';
            if (this.quizStep === 'topic') {
                this.quizTopic = userInput;
                this.quizStep = 'type';
                setTimeout(() => {
                    this.quizMessages.push({
                        role: 'assistant',
                        content: `Great! I'll create a quiz on <strong>${userInput}</strong>. What type of questions would you like?`,
                        buttons: ['Multiple Choice', 'Fill in Blanks', 'True/False', 'Mixed']
                    });
                }, 500);
            } else if (this.quizStep === 'generating') {
                this.quizMessages.push({
                    role: 'assistant',
                    content: 'Please wait while I generate your quiz...'
                });
            }
        },
        async handleQuizButton(btn) {
            this.quizMessages.push({ role: 'user', content: btn });
            if (this.quizStep === 'type') {
                this.quizStep = 'difficulty';
                setTimeout(() => {
                    this.quizMessages.push({
                        role: 'assistant',
                        content: 'How difficult should the quiz be?',
                        buttons: ['Easy', 'Medium', 'Hard']
                    });
                }, 400);
            } else if (this.quizStep === 'difficulty') {
                this.quizStep = 'generating';
                this.isGeneratingQuiz = true;
                this.quizMessages.push({
                    role: 'assistant',
                    content: `Generating your ${btn.toLowerCase()} quiz on <strong>${this.quizTopic}</strong>...`
                });
                const typeMap = {
                    'Multiple Choice': 'mcq',
                    'Fill in Blanks': 'fill',
                    'True/False': 'truefalse',
                    'Mixed': 'mixed'
                };
                const quiz = await this.generateQuizFromConversation(btn.toLowerCase());
                this.isGeneratingQuiz = false;
                if (quiz) {
                    this.activeQuiz = quiz;
                    this.quizMessages.push({
                        role: 'assistant',
                        content: `Your quiz is ready! <strong>${quiz.title}</strong> with ${quiz.questions.length} questions. Good luck!`
                    });
                } else {
                    this.quizMessages.push({
                        role: 'assistant',
                        content: 'Sorry, I had trouble generating the quiz. Would you like to try another topic?',
                        buttons: ['Try Again', 'New Topic']
                    });
                }
                this.quizStep = 'topic';
            } else if (btn === 'Try Again') {
                this.quizStep = 'type';
                this.quizMessages.push({
                    role: 'assistant',
                    content: `Let's try again with <strong>${this.quizTopic}</strong>. What type of questions?`,
                    buttons: ['Multiple Choice', 'Fill in Blanks', 'True/False', 'Mixed']
                });
            } else if (btn === 'New Topic') {
                this.quizStep = 'topic';
                this.quizTopic = '';
                this.quizMessages.push({
                    role: 'assistant',
                    content: 'Sure! What topic would you like to be quizzed on?'
                });
            }
        },
        async generateQuizFromConversation(difficulty = 'medium') {
            const typeMsg = this.quizMessages.find(m => m.role === 'user' && ['Multiple Choice', 'Fill in Blanks', 'True/False', 'Mixed'].includes(m.content));
            const quizType = typeMsg?.content || 'Mixed';
            const typePrompt = {
                'Multiple Choice': 'multiple choice questions with 4 options',
                'Fill in Blanks': 'fill in the blank questions',
                'True/False': 'true or false questions',
                'Mixed': 'a mix of multiple choice, fill in blank, and true/false questions'
            }[quizType];
            const prompt = `Generate an EDUCATIONAL quiz with 5 ${typePrompt} about "${this.quizTopic}".
Difficulty level: ${difficulty}
Return ONLY valid JSON (no markdown):
{
  "title": "Quiz: ${this.quizTopic}",
  "questions": [
    {"type": "mcq", "question": "Question?", "options": ["A", "B", "C", "D"], "answer": "Correct", "explanation": "Brief explanation"},
    {"type": "fill", "question": "The ____ is important.", "answer": "answer", "explanation": "Brief explanation"},
    {"type": "truefalse", "question": "Statement", "answer": "True", "explanation": "Brief explanation"}
  ]
}`;
            try {
                const response = await fetch("/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [{ role: "user", content: prompt }],
                        stream: false
                    })
                });
                const data = await response.json();
                let quizText = data.choices[0].message.content;
                quizText = quizText.replace(/```json\n?|```/g, '').trim();
                const quizData = JSON.parse(quizText);
                return {
                    title: quizData.title || `Quiz: ${this.quizTopic}`,
                    questions: quizData.questions.map(q => ({
                        ...q,
                        type: q.type || 'mcq',
                        answered: false,
                        correct: false,
                        selected: null,
                        userInput: ''
                    }))
                };
            } catch (e) {
                console.error("Quiz generation error:", e);
                return null;
            }
        },
        loadNotes() {
            const notesRef = ref(rtdb, `notes/${this.currentUser.uid}`);
            onValue(notesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.notes = Object.entries(data)
                        .map(([key, value]) => ({ id: key, ...value }))
                        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                } else {
                    this.notes = [];
                }
            });
        },
        createNewNote() {
            const noteId = 'note_' + Date.now();
            const newNote = {
                title: 'Untitled',
                content: '',
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            set(ref(rtdb, `notes/${this.currentUser.uid}/${noteId}`), newNote);
            this.activeNote = { id: noteId, ...newNote };
            this.noteTitle = newNote.title;
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
            this.autoSaveNote();
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
        autoSaveNote() {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.saveNote();
            }, 1000);
        },
        saveNote() {
            if (!this.activeNote) return;
            update(ref(rtdb, `notes/${this.currentUser.uid}/${this.activeNote.id}`), {
                title: this.noteTitle,
                content: this.noteContent,
                updatedAt: Date.now()
            });
        },
        deleteNote(note) {
            this.showConfirm('Delete Note', 'Are you sure you want to delete this note?', async () => {
                try {
                    await remove(ref(rtdb, `notes/${this.currentUser.uid}/${note.id}`));
                    if (this.activeNote?.id === note.id) {
                        this.activeNote = null;
                        this.noteTitle = '';
                        this.noteContent = '';
                    }
                    this.showToastNotification('Note deleted');
                } catch (e) {
                    console.error("Error deleting note:", e);
                }
            });
        },
        async loadSettings() {
            try {
                const settingsDoc = await getDoc(doc(db, 'userSettings', this.currentUser.uid));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    this.settings = { ...this.settings, ...data.settings };
                    this.profileData = { ...this.profileData, ...data.profile };
                }
            } catch (e) {
                console.error("Error loading settings:", e);
            }
        },
        async saveSettings() {
            try {
                await setDoc(doc(db, 'userSettings', this.currentUser.uid), {
                    settings: this.settings,
                    profile: this.profileData,
                    updatedAt: new Date()
                }, { merge: true });
                this.showToastNotification('Settings saved');
            } catch (e) {
                console.error("Error saving settings:", e);
            }
        },
        async saveProfile() {
            await this.saveSettings();
        },
        initCanvas() {
            const container = this.$refs.canvasArea;
            if (!container) return;
            this.canvas = this.$refs.drawCanvas;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.ctx = this.canvas.getContext('2d');
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
        },
        startDrawing(e) {
            if (this.wbTool === 'hand' || this.wbTool === 'pointer') return;
            this.isDrawing = true;
            this.currentPath = { points: [] };
            this.draw(e);
        },
        draw(e) {
            if (!this.isDrawing || !this.canvas) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.ctx.lineWidth = this.wbSize;
            if (this.wbTool === 'eraser') {
                this.ctx.strokeStyle = '#fafafa';
                this.ctx.lineWidth = this.wbSize * 4;
            } else {
                this.ctx.strokeStyle = this.wbColor;
            }
            if (this.currentPath.points.length === 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
            this.currentPath.points.push({ x, y });
        },
        stopDrawing() {
            this.isDrawing = false;
        },
        clearBoard() {
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        },
        downloadBoard() {
            if (!this.canvas) return;
            const link = document.createElement('a');
            link.download = 'whiteboard.png';
            link.href = this.canvas.toDataURL();
            link.click();
        },
        selectTool(tool) {
            this.wbTool = tool;
            this.showOptionsPanel = tool === 'pen';
        }
    }
}).mount('#app');
