const { createApp } = Vue;

createApp({
    data() {
        return {
            activeTab: 'overview',
            holidayMode: false,
            showMeetingModal: false,
            chatInput: '',
            currentMonthIndex: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            chatMessages: [
                {
                    id: 1,
                    sender: 'ai',
                    content: 'Hi Anirudh! I\'m your AI study assistant. How can I help you today?'
                }
            ],
            mySubjects: [
                {
                    name: 'Chemistry',
                    progress: 78,
                    sessions: 8,
                    coach: 'Arjun Das.'
                },
                {
                    name: 'Mathematics',
                    progress: 65,
                    sessions: 12,
                    coach: 'Yashvardhan Nanghi.'
                },
                {
                    name: 'English',
                    progress: 82,
                    sessions: 6,
                    coach: 'Aditya Baht.'
                }
            ],
            availableDays: [
                { name: 'Monday', available: true },
                { name: 'Tuesday', available: true },
                { name: 'Wednesday', available: false },
                { name: 'Thursday', available: true },
                { name: 'Friday', available: true },
                { name: 'Saturday', available: false },
                { name: 'Sunday', available: false }
            ],
            upcomingSessions: [
                {
                    id: 1,
                    time: '3:00 PM',
                    subject: 'Chemistry',
                    coach: 'Arjun Sharma'
                },
                {
                    id: 2,
                    time: '4:30 PM',
                    subject: 'Mathematics',
                    coach: 'Yashvardhan Singh'
                },
                {
                    id: 3,
                    time: '6:00 PM',
                    subject: 'English',
                    coach: 'Aditya Gopalan'
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
                const hasSession = Math.random() > 0.8;
                
                days.push({
                    date: currentDate.toDateString(),
                    day: currentDate.getDate(),
                    isToday,
                    hasSession
                });
            }
            
            return days;
        }
    },
    methods: {
        toggleHolidayMode() {
            this.holidayMode = !this.holidayMode;
        },
        joinMeeting() {
            this.showMeetingModal = true;
            this.$nextTick(() => {
                this.customizeJitsiMeet();
            });
        },
        customizeJitsiMeet() {
            const iframe = document.getElementById('jitsi-frame');
            if (iframe) {
                iframe.onload = () => {
                    try {
// custom css?
                        const jitsiDocument = iframe.contentDocument || iframe.contentWindow.document;
                        const customStyle = jitsiDocument.createElement('style');
                        customStyle.textContent = `
                            .toolbox {
                                background: #14b8a6 !important;
                                border-radius: 12px !important;
                                margin: 10px !important;
                            }
                            
                            .toolbox .toolbox-button {
                                background: rgba(255, 255, 255, 0.1) !important;
                                color: white !important;
                                border-radius: 8px !important;
                                margin: 2px !important;
                            }
                            
                            .toolbox .toolbox-button:hover {
                                background: rgba(255, 255, 255, 0.2) !important;
                            }
                            
                            .watermark, .leftwatermark {
                                display: none !important;
                            }
                            
                            .filmstrip {
                                background: linear-gradient(135deg, #14b8a6, #0d9488) !important;
                                border-radius: 12px !important;
                                margin: 10px !important;
                            }
                            
                            .videocontainer {
                                border-radius: 12px !important;
                                overflow: hidden !important;
                                border: 2px solid rgba(255, 255, 255, 0.1) !important;
                            }
                            
                            .video-layout-large-video {
                                background: #f8fafc !important;
                                border-radius: 16px !important;
                            }
                            
                            .chat-container {
                                background: #fefefe !important;
                                color: #1f2937 !important;
                                border-radius: 12px !important;
                            }
                            
                            .chat-input {
                                border: 2px solid #14b8a6 !important;
                                border-radius: 8px !important;
                                background: #fefefe !important;
                            }
                            
                            .notification {
                                background: #14b8a6 !important;
                                color: white !important;
                                border-radius: 8px !important;
                            }
                            
                            [class*="watermark"], [class*="brand"], [class*="logo"] {
                                opacity: 0 !important;
                                visibility: hidden !important;
                            }
                            
                            .subject {
                                background: linear-gradient(135deg, #14b8a6, #0d9488) !important;
                                color: white !important;
                                padding: 8px 16px !important;
                                border-radius: 20px !important;
                                font-weight: 600 !important;
                            }
                            
                            .participants-pane {
                                background: #fefefe !important;
                                color: #1f2937 !important;
                                border-radius: 12px !important;
                            }
                        `;
                        jitsiDocument.head.appendChild(customStyle);
                    } catch (e) {
                        console.log('error');
                    }
                };
            }
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
        sendMessage() {
            if (this.chatInput.trim()) {
                this.chatMessages.push({
                    id: Date.now(),
                    sender: 'user',
                    content: this.chatInput
                });
                
                setTimeout(() => {
                    this.chatMessages.push({
                        id: Date.now() + 1,
                        sender: 'ai',
                        content: this.generateAIResponse(this.chatInput)
                    });
                    this.scrollToBottom();
                }, 1000);
                
                this.chatInput = '';
                this.scrollToBottom();
            }
        },
        askQuickQuestion(event) {
            const question = event.target.textContent;
            this.chatInput = question;
            this.sendMessage();
        },
        generateAIResponse(question) {
            const responses = [
                "Great question! Let me break that down for you step by step...",
                "I'd be happy to help with that! Here's what you need to know...",
                "That's a common topic students ask about. Here's a clear explanation...",
                "Let me help you understand this concept better...",
                "Good thinking! Here's how to approach this problem..."
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
        }
    }
}).mount('#app');