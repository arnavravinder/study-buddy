const { createApp } = Vue; // yeah i'm still using vue2 syntax, sue me

createApp({
    data() {
        return {
            activeTab: 'overview',
            holidayMode: false,
            showMeetingModal: false,
            chatInput: '',
            currentMonthIndex: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            studentFilter: 'all',
            chatMessages: [
                {
                    id: 1,
                    sender: 'ai',
                    content: 'Hi Arjun! I\'m your AI teaching assistant. How can I help you prepare for your sessions today?'
                }
            ],
            recentStudents: [ // ts should pull from db
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
        startMeeting() { // no more jitsi, we getstream now
            this.showMeetingModal = true;
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
                        content: this.generateTeachingResponse(this.chatInput)
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
        }
    }
}).mount('#app');