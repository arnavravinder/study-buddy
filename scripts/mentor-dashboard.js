import { StreamVideoClient } from '@stream-io/video-client';

const { createApp } = Vue;

createApp({
    data() {
        return {
            activeTab: 'overview',
            holidayMode: false,
            showMeetingModal: false,
            callStatus: 'Connecting...',
            isAudioEnabled: true,
            isVideoEnabled: true,
            isScreenSharing: false,
            streamClient: null,
            currentCall: null,
            chatInput: '',
            explainMore: false,
            conversationHistory: [],
            currentMonthIndex: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            studentFilter: 'all',
            /* AI Chat State for Full Screen */
            aiMessages: [],
            aiConversationHistory: [],
            aiIsTyping: false,
            aiInput: '',
            aiHistory: [
                { id: 1, title: 'Lesson Plan: Thermodynamics' },
                { id: 2, title: 'Student Engagement Strategies' },
                { id: 3, title: 'Quiz Generation: Algebra' }
            ],
            recentStudents: [
                {
                    id: 1,
                    name: 'Aditya Sharma',
                    initials: 'AS',
                    subject: 'Chemistry',
                    progress: 78
                },
                {
                    id: 2,
                    name: 'Yashvardhan Patel',
                    initials: 'YP',
                    subject: 'Mathematics',
                    progress: 65
                },
                {
                    id: 3,
                    name: 'Anirudh Singh',
                    initials: 'AN',
                    subject: 'Physics',
                    progress: 82
                }
            ],
            allStudents: [
                {
                    id: 1,
                    name: 'Aditya Sharma',
                    initials: 'AS',
                    grade: 'Grade 10',
                    subject: 'chemistry',
                    sessions: 8,
                    progress: 78,
                    rating: 4.8,
                    struggles: 'Organic chemistry reactions',
                    nextSession: 'Today, 3:00 PM'
                },
                {
                    id: 2,
                    name: 'Yashvardhan Patel',
                    initials: 'YP',
                    grade: 'Grade 9',
                    subject: 'mathematics',
                    sessions: 12,
                    progress: 65,
                    rating: 4.5,
                    struggles: 'Quadratic equations',
                    nextSession: 'Tomorrow, 4:30 PM'
                },
                {
                    id: 3,
                    name: 'Anirudh Singh',
                    initials: 'AN',
                    grade: 'Grade 11',
                    subject: 'physics',
                    sessions: 6,
                    progress: 82,
                    rating: 4.9,
                    struggles: 'Electromagnetic waves',
                    nextSession: 'Wednesday, 6:00 PM'
                },
                {
                    id: 4,
                    name: 'Arjun Gupta',
                    initials: 'AG',
                    grade: 'Grade 10',
                    subject: 'chemistry',
                    sessions: 5,
                    progress: 55,
                    rating: 4.3,
                    struggles: 'Balancing equations',
                    nextSession: 'Thursday, 2:00 PM'
                }
            ],
            teachingSubjects: [
                {
                    name: 'Chemistry',
                    students: 5,
                    sessionsPerWeek: 12,
                    rating: 4.8,
                    confidence: 5,
                    topics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry']
                },
                {
                    name: 'Mathematics',
                    students: 2,
                    sessionsPerWeek: 6,
                    rating: 4.6,
                    confidence: 4,
                    topics: ['Algebra', 'Geometry', 'Trigonometry', 'Calculus']
                },
                {
                    name: 'Physics',
                    students: 1,
                    sessionsPerWeek: 3,
                    rating: 4.9,
                    confidence: 4,
                    topics: ['Mechanics', 'Electromagnetism', 'Thermodynamics', 'Optics']
                }
            ],
            teachingDays: [
                { name: 'Monday', available: true, hours: '3:00-6:00 PM' },
                { name: 'Tuesday', available: true, hours: '3:00-6:00 PM' },
                { name: 'Wednesday', available: false, hours: '' },
                { name: 'Thursday', available: true, hours: '2:00-7:00 PM' },
                { name: 'Friday', available: true, hours: '3:00-5:00 PM' },
                { name: 'Saturday', available: false, hours: '' },
                { name: 'Sunday', available: false, hours: '' }
            ],
            todaysSchedule: [
                {
                    id: 1,
                    time: '3:00 PM',
                    subject: 'Chemistry',
                    student: 'Aditya Sharma',
                    topic: 'Organic Chemistry Basics'
                },
                {
                    id: 2,
                    time: '4:30 PM',
                    subject: 'Mathematics',
                    student: 'Yashvardhan Patel',
                    topic: 'Quadratic Equations'
                },
                {
                    id: 3,
                    time: '6:00 PM',
                    subject: 'Physics',
                    student: 'Anirudh Singh',
                    topic: 'Wave Properties'
                }
            ]
        };
    },
    computed: {
        currentMonth() {
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            return `${months[this.currentMonthIndex]} ${this.currentYear}`;
        },
        calendarDays() {
            const firstDay = new Date(this.currentYear, this.currentMonthIndex, 1);
            const lastDay = new Date(this.currentYear, this.currentMonthIndex + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());

            const days = [];
            const today = new Date();

            for (let i = 0; i < 42; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);

                const isToday = currentDate.toDateString() === today.toDateString();
                const hasSession = Math.random() > 0.7;
                const sessionCount = hasSession ? Math.floor(Math.random() * 3) + 1 : 0;

                days.push({
                    date: currentDate.toDateString(),
                    day: currentDate.getDate(),
                    isToday,
                    hasSession,
                    sessionCount
                });
            }

            return days;
        },
        filteredStudents() {
            if (this.studentFilter === 'all') {
                return this.allStudents;
            }
            return this.allStudents.filter(student => student.subject === this.studentFilter);
        }
    },
    methods: {
        toggleHolidayMode() {
            this.holidayMode = !this.holidayMode;
        },
        async startMeeting() {
            const callId = 'chemistry-session-' + Date.now();
            window.location.href = `/tools/meeting?room=${callId}&name=Arjun Coach`;
        },
        async initializeGetStream() {
            try {
                const apiKey = 'z4j6f2bay984';
                const userId = 'arjun-coach-mentor';
                const userName = 'Arjun Coach';
                const callId = 'chemistry-session-' + Date.now();

                const tokenResponse = await this.generateToken(userId);

                const user = {
                    id: userId,
                    name: userName,
                    image: 'https://getstream.io/random_png/?name=' + userName
                };

                this.streamClient = new StreamVideoClient({
                    apiKey: apiKey,
                    user: user,
                    token: tokenResponse.token,
                });

                const call = this.streamClient.call('default', callId);
                this.currentCall = call;

                await call.join({ create: true });
                this.callStatus = 'Connected';

                await call.camera.enable();
                await call.microphone.enable();

                this.renderVideoStreams(call);

                call.on('participantJoined', () => {
                    this.renderVideoStreams(call);
                });

                call.on('participantLeft', () => {
                    this.renderVideoStreams(call);
                });

            } catch (error) {
                this.callStatus = 'Connection failed';
            }
        },
        async generateToken(userId) {
            const apiKey = 'z4j6f2bay984';
            const apiSecret = 'xwc8e49hnp6rmkdzmc6wcy7mft6xprsquxvaufchqrt59j3zprffsu48a2pmqqsz';

            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            const now = Math.floor(Date.now() / 1000);
            const payload = {
                user_id: userId,
                iat: now,
                exp: now + 3600
            };

            const base64Header = btoa(JSON.stringify(header));
            const base64Payload = btoa(JSON.stringify(payload));
            const signature = await this.hmacSHA256(apiSecret, base64Header + '.' + base64Payload);

            return {
                token: base64Header + '.' + base64Payload + '.' + signature
            };
        },
        async hmacSHA256(secret, message) {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const messageData = encoder.encode(message);

            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign('HMAC', key, messageData);
            return btoa(String.fromCharCode(...new Uint8Array(signature)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        },
        renderVideoStreams(call) {
            const localVideoEl = document.getElementById('local-video');
            const remoteVideoEl = document.getElementById('remote-video');

            if (localVideoEl && call.camera.state.mediaStream) {
                localVideoEl.innerHTML = '';
                const video = document.createElement('video');
                video.srcObject = call.camera.state.mediaStream;
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                localVideoEl.appendChild(video);
            }

            if (remoteVideoEl) {
                remoteVideoEl.innerHTML = '';
                call.state.participants.forEach(participant => {
                    if (participant.videoStream) {
                        const video = document.createElement('video');
                        video.srcObject = participant.videoStream;
                        video.autoplay = true;
                        video.playsInline = true;
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.objectFit = 'cover';
                        remoteVideoEl.appendChild(video);
                    }
                });
            }
        },
        async toggleAudio() {
            if (this.currentCall) {
                if (this.isAudioEnabled) {
                    await this.currentCall.microphone.disable();
                } else {
                    await this.currentCall.microphone.enable();
                }
                this.isAudioEnabled = !this.isAudioEnabled;
            }
        },
        async toggleVideo() {
            if (this.currentCall) {
                if (this.isVideoEnabled) {
                    await this.currentCall.camera.disable();
                } else {
                    await this.currentCall.camera.enable();
                }
                this.isVideoEnabled = !this.isVideoEnabled;
            }
        },
        async toggleScreenShare() {
            if (this.currentCall) {
                if (this.isScreenSharing) {
                    await this.currentCall.screenShare.disable();
                } else {
                    await this.currentCall.screenShare.enable();
                }
                this.isScreenSharing = !this.isScreenSharing;
            }
        },
        async leaveMeeting() {
            if (this.currentCall) {
                await this.currentCall.leave();
                this.currentCall = null;
            }
            if (this.streamClient) {
                await this.streamClient.disconnectUser();
                this.streamClient = null;
            }
            this.showMeetingModal = false;
            this.callStatus = 'Disconnected';
            this.isAudioEnabled = true;
            this.isVideoEnabled = true;
            this.isScreenSharing = false;
        },
        changeMonth(direction) {
            this.currentMonthIndex += direction;
            if (this.currentMonthIndex < 0) {
                this.currentMonthIndex = 11;
                this.currentYear--;
            } else if (this.currentMonthIndex > 11) {
                this.currentMonthIndex = 0;
                this.currentYear++;
            }
        },
        async sendAiMessage() {
            if (!this.aiInput.trim()) return;

            const userMsg = {
                id: Date.now(),
                sender: 'user',
                content: this.aiInput
            };
            this.aiMessages.push(userMsg);

            const userText = this.aiInput;
            this.aiInput = '';
            this.scrollToAiBottom();

            const aiMsgId = Date.now() + 1;
            this.aiMessages.push({
                id: aiMsgId,
                sender: 'ai',
                content: '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>'
            });
            this.scrollToAiBottom();
            this.aiIsTyping = true;

            this.aiConversationHistory.push({ role: 'user', content: userText });
            if (this.aiConversationHistory.length > 10) {
                this.aiConversationHistory = this.aiConversationHistory.slice(-10);
            }

            try {
                const apiKey = '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';
                const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

                const systemPrompt = {
                    role: 'system',
                    content: 'You are a helpful AI teaching assistant for mentors and tutors. Your goal is to help educators prepare lessons, create teaching materials, understand pedagogical strategies, and support their students effectively. Use Markdown. Use LaTeX for math.'
                };

                const body = {
                    model: 'openai/gpt-4o-mini',
                    messages: [systemPrompt, ...this.aiConversationHistory],
                    stream: true
                };

                let aiContent = '';

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://study-buddy.app',
                        'X-Title': 'Study Buddy'
                    },
                    body: JSON.stringify(body)
                });

                if (!response.ok) throw new Error('API Error');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

                    for (const line of lines) {
                        const data = line.replace(/^data:\s*/, '');
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                aiContent += parsed.choices[0].delta.content;
                                this.updateAiMessage(aiMsgId, aiContent);
                                this.scrollToAiBottom();
                            }
                        } catch (e) { }
                    }
                }
                this.aiConversationHistory.push({ role: 'assistant', content: aiContent });
                this.aiIsTyping = false;

            } catch (error) {
                this.updateAiMessage(aiMsgId, 'Error connecting to AI service.');
                this.aiIsTyping = false;
            }
        },
        updateAiMessage(id, rawContent) {
            let htmlContent = this.renderMarkdown(rawContent);
            const index = this.aiMessages.findIndex(m => m.id === id);
            if (index !== -1) {
                this.aiMessages[index].content = htmlContent;
            }
        },
        renderMarkdown(text) {
            let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
                try { return katex.renderToString(expr, { displayMode: true }); }
                catch (e) { return match; }
            });
            processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, expr) => {
                try { return katex.renderToString(expr, { displayMode: false }); }
                catch (e) { return match; }
            });
            return marked.parse(processed);
        },
        scrollToAiBottom() {
            this.$nextTick(() => {
                const el = document.querySelector('.ai-messages-scroll');
                if (el) el.scrollTop = el.scrollHeight;
            });
        },
        startNewChat() {
            this.aiMessages = [];
            this.aiInput = '';
            this.aiConversationHistory = [];
        },
        sendSuggestion(text) {
            this.aiInput = text;
            this.sendAiMessage();
        },
        askQuickQuestion(event) {
            const question = event.target.textContent;
            this.chatInput = question;
            this.sendMessage();
        },
        generateTeachingResponse(question) {
            const responses = [
                "Here's a teaching strategy that works well for this concept...",
                "I'd recommend breaking this down into smaller, manageable parts for your students...",
                "A great way to explain this is through real-world examples...",
                "Try using visual aids or interactive demonstrations for better understanding...",
                "Consider adapting your approach based on each student's learning style..."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        },
        scrollToBottom() {
            this.$nextTick(() => {
                const messagesContainer = this.$refs.chatMessages;
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        },
        getSubjectIcon(subjectName) {
            const iconMap = {
                'chemistry': 'ph-bold ph-flask',
                'mathematics': 'ph-bold ph-math-operations',
                'english': 'ph-bold ph-book-open',
                'physics': 'ph-bold ph-atom',
                'biology': 'ph-bold ph-dna',
                'history': 'ph-bold ph-clock-clockwise',
                'geography': 'ph-bold ph-globe'
            };
            return iconMap[subjectName.toLowerCase()] || 'ph-bold ph-book';
        }
    }
}).mount('#app');