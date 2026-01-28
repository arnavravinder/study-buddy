const { createApp } = Vue;

createApp({
    data() {
        return {
            activeTab: 'overview',
            sidebarOpen: false, /* Mobile Sidebar State */
            showAiChat: false, /* AI Chat Widget State */
            aiHistory: [
                { id: 1, title: 'Chemistry Exam Prep' },
                { id: 2, title: 'Calculus Derivatives' },
                { id: 3, title: 'Romeo & Juliet Themes' },
                { id: 4, title: 'Physics Formula Sheet' }
            ],
            holidayMode: false,
            showAskQuestionModal: false,
            showBookingConfirmation: false,
            showNotesPanel: false,
            showWhiteboardPanel: false,
            chatInput: '',
            explainMore: false,
            conversationHistory: [],
            currentMonthIndex: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            communityFilter: 'all',
            eventFilter: 'all',
            selectedMentor: null,
            mentorChatInput: '',
            /* AI Chat State */
            aiMessages: [], // Messages for the full-screen AI page
            aiConversationHistory: [], // Context for the AI
            aiIsTyping: false,
            aiInput: '',
            aiCurrentModel: 'openai/gpt-4o-mini',
            scheduleForm: {
                subject: '',
                coach: '',
                date: '',
                time: '',
                reason: ''
            },
            bookingDetails: {
                subject: '',
                coach: '',
                date: '',
                time: ''
            },
            flatpickrInstance: null,
            newQuestion: {
                subject: '',
                title: '',
                body: ''
            },
            notes: [
                {
                    id: 1,
                    title: 'Organic Chemistry - Hydrocarbons',
                    preview: 'Alkanes, alkenes, alkynes and their properties...',
                    subject: 'Chemistry',
                    date: 'Oct 15, 2025',
                    content: '<h3>Hydrocarbons Overview</h3><p><strong>Alkanes</strong> - Saturated hydrocarbons with single bonds (CnH2n+2)</p><p>Examples: Methane (CH4), Ethane (C2H6), Propane (C3H8)</p><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-lightbulb"></i></div><div class="enhancement-content"><strong>💡 Related Discussion:</strong> You also discussed <em>combustion reactions of alkanes</em> with Priya in your last session. She mentioned these are important for the exam!</div></div><p><strong>Alkenes</strong> - Unsaturated hydrocarbons with double bonds (CnH2n)</p><p>Examples: Ethene (C2H4), Propene (C3H6)</p><p><strong>Alkynes</strong> - Unsaturated hydrocarbons with triple bonds (CnH2n-2)</p><p>Examples: Ethyne (C2H2), Propyne (C3H4)</p><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-chat-circle-dots"></i></div><div class="enhancement-content"><strong>📚 Tutor Tip:</strong> Priya suggested creating a comparison table for these three hydrocarbon types - it helps visualize the differences!</div></div><p><u>Important Notes:</u></p><ul><li>Alkanes are generally unreactive</li><li>Alkenes undergo addition reactions</li><li>Alkynes are the most reactive</li></ul>'
                },
                {
                    id: 2,
                    title: 'Calculus - Differentiation Rules',
                    preview: 'Power rule, product rule, quotient rule, chain rule...',
                    subject: 'Mathematics',
                    date: 'Oct 14, 2025',
                    content: '<h3>Differentiation Rules</h3><p><strong>Power Rule:</strong> d/dx(x^n) = nx^(n-1)</p><p><strong>Product Rule:</strong> d/dx(uv) = u(dv/dx) + v(du/dx)</p><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-chalkboard-teacher"></i></div><div class="enhancement-content"><strong>👨‍🏫 Session Note:</strong> Amit emphasized the <em>product rule</em> is often confused with simple multiplication - remember to differentiate each part separately!</div></div><p><strong>Quotient Rule:</strong> d/dx(u/v) = [v(du/dx) - u(dv/dx)] / v^2</p><p><strong>Chain Rule:</strong> d/dx[f(g(x))] = f\'(g(x)) × g\'(x)</p><p><u>Practice Problems:</u></p><p>1. Find d/dx(3x^4 + 2x^2 - 5)</p><p>2. Differentiate (x^2 + 1)(x^3 - 2x)</p><p>3. Find the derivative of sin(2x^2)</p><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-trophy"></i></div><div class="enhancement-content"><strong>🎯 Coach Recommendation:</strong> Amit said to practice chain rule problems daily - they appear frequently on the exam!</div></div>'
                },
                {
                    id: 3,
                    title: 'English Literature - Persuasive Essay Tips',
                    preview: 'Introduction hooks, thesis statements, body structure...',
                    subject: 'English',
                    date: 'Oct 12, 2025',
                    content: '<h3>Persuasive Essay Structure</h3><p><strong>Introduction (3-5 sentences)</strong></p><ul><li>Hook: Start with a question, fact, or quote</li><li>Background: Provide context</li><li>Thesis: State your position clearly</li></ul><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-pencil-line"></i></div><div class="enhancement-content"><strong>✍️ Mentor Insight:</strong> Neha reviewed your last essay and loved your hook! She suggested you explore <em>rhetorical questions</em> more often for stronger openings.</div></div><p><strong>Body Paragraphs (3-4 paragraphs)</strong></p><ul><li>Topic sentence introducing the main point</li><li>Evidence and examples</li><li>Analysis and explanation</li><li>Transition to next paragraph</li></ul><p><strong>Conclusion (3-4 sentences)</strong></p><ul><li>Restate thesis in new words</li><li>Summarize key points</li><li>Call to action or final thought</li></ul><div class="note-enhancement"><div class="enhancement-icon"><i class="ph-bold ph-bookmark"></i></div><div class="enhancement-content"><strong>📖 From Session:</strong> You discussed <em>counterarguments</em> with Neha - she said addressing opposing views strengthens your credibility!</div></div><p><u>Key Persuasive Techniques:</u></p><p>• Ethos (credibility) • Pathos (emotion) • Logos (logic)</p>'
                },
                {
                    id: 4,
                    title: 'Physics - Newton\'s Laws of Motion',
                    preview: 'Three fundamental laws governing motion and forces...',
                    subject: 'Physics',
                    date: 'Oct 10, 2025',
                    content: '<h3>Newton\'s Three Laws</h3><p><strong>First Law (Inertia):</strong></p><p>An object at rest stays at rest, and an object in motion stays in motion at constant velocity unless acted upon by a net external force.</p><p><strong>Second Law (F = ma):</strong></p><p>The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.</p><p>Formula: F = ma</p><p><strong>Third Law (Action-Reaction):</strong></p><p>For every action, there is an equal and opposite reaction.</p><p><u>Real-world Examples:</u></p><ul><li>Seatbelts (First Law)</li><li>Pushing a shopping cart (Second Law)</li><li>Rocket propulsion (Third Law)</li></ul>'
                },
                {
                    id: 5,
                    title: 'Biology - Cell Structure',
                    preview: 'Organelles and their functions in eukaryotic cells...',
                    subject: 'Biology',
                    date: 'Oct 8, 2025',
                    content: '<h3>Eukaryotic Cell Organelles</h3><p><strong>Nucleus:</strong> Control center, contains DNA</p><p><strong>Mitochondria:</strong> Powerhouse of the cell, produces ATP through cellular respiration</p><p><strong>Ribosomes:</strong> Protein synthesis</p><p><strong>Endoplasmic Reticulum (ER):</strong></p><ul><li>Rough ER: Protein transport</li><li>Smooth ER: Lipid synthesis</li></ul><p><strong>Golgi Apparatus:</strong> Modifies and packages proteins</p><p><strong>Lysosomes:</strong> Digestion and waste removal</p><p><strong>Cell Membrane:</strong> Controls what enters/exits the cell</p><p><u>Plant Cell Additional Organelles:</u></p><ul><li>Chloroplasts (photosynthesis)</li><li>Cell wall (structure and support)</li><li>Large central vacuole (storage)</li></ul>'
                },
                {
                    id: 6,
                    title: 'Chemistry - Periodic Table Trends',
                    preview: 'Atomic radius, ionization energy, electronegativity...',
                    subject: 'Chemistry',
                    date: 'Oct 5, 2025',
                    content: '<h3>Periodic Trends</h3><p><strong>Atomic Radius:</strong></p><p>• Increases down a group (more shells)</p><p>• Decreases across a period (more protons pull electrons closer)</p><p><strong>Ionization Energy:</strong></p><p>• Decreases down a group</p><p>• Increases across a period</p><p>• Energy required to remove an electron</p><p><strong>Electronegativity:</strong></p><p>• Decreases down a group</p><p>• Increases across a period</p><p>• Ability to attract electrons in a bond</p><p><strong>Metallic Character:</strong></p><p>• Increases down a group</p><p>• Decreases across a period</p><p><u>Remember:</u> Fluorine is the most electronegative element!</p>'
                }
            ],
            selectedNote: null,
            aiNoteSuggestion: {
                description: 'Add a summary section to help with quick review',
                suggestion: '📝 Summary: This note covers the key concepts of hydrocarbons including alkanes (single bonds), alkenes (double bonds), and alkynes (triple bonds). Remember: reactivity increases from alkanes to alkynes!',
                dismissed: false
            },
            wbTool: 'pen',
            wbPenSize: 4,
            wbColor: '#2D3748',
            wbColors: ['#2D3748', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
            whiteboardContext: null,
            isDrawing: false,
            wbHistory: [],
            /* Chat */
            chatInput: '', // For the widget
            isAiTyping: false,
            chatMessages: [ // For the widget
                {
                    id: 1,
                    sender: 'ai',
                    content: 'Hi! I\'m your AI study assistant. How can I help you today?'
                }
            ],
            /* Full Screen AI Messages Initial State */
            aiMessages: [],
            aiHistory: [
                { id: 1, title: 'Chemistry Exam Prep' },
                { id: 2, title: 'Calculus Derivatives' },
                { id: 3, title: 'Romeo & Juliet Themes' },
                { id: 4, title: 'Physics Formula Sheet' }
            ],
            mySubjects: [
                {
                    name: 'Chemistry',
                    progress: 78,
                    sessions: 8,
                    coach: 'Priya Sharma'
                },
                {
                    name: 'Mathematics',
                    progress: 65,
                    sessions: 12,
                    coach: 'Amit Patel'
                },
                {
                    name: 'English',
                    progress: 82,
                    sessions: 6,
                    coach: 'Neha Singh'
                },
                {
                    name: 'Biology',
                    progress: 70,
                    sessions: 5,
                    coach: 'Divya Kapoor'
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
                    coach: 'Priya Sharma'
                },
                {
                    id: 2,
                    time: '4:30 PM',
                    subject: 'Mathematics',
                    coach: 'Amit Patel'
                },
                {
                    id: 3,
                    time: '6:00 PM',
                    subject: 'English',
                    coach: 'Neha Singh'
                }
            ],
            calendarEvents: [
                { id: 1, type: 'Session', title: 'Chemistry Session', description: 'with Priya Sharma', date: '2025-10-18', color: '#6a9ff5' },
                { id: 2, type: 'Exam', title: 'Mathematics Mock Exam', description: 'CIE IGCSE Paper 2', date: '2025-10-25', color: '#ef4444' },
                { id: 3, type: 'Assessment', title: 'English Essay Submission', description: 'Coursework Deadline', date: '2025-10-22', color: '#f59e0b' },
                { id: 4, type: 'Holiday', title: 'Diwali Break', description: 'School Holiday', date: '2025-11-01', color: '#8b5cf6' },
                { id: 5, type: 'Exam', title: 'Chemistry Practical Exam', description: 'CIE IGCSE Paper 3', date: '2025-11-08', color: '#ef4444' },
                { id: 6, type: 'Session', title: 'Mathematics Session', description: 'with Amit Patel', date: '2025-10-19', color: '#6a9ff5' },
                { id: 7, type: 'Assessment', title: 'Physics Lab Report', description: 'Coursework Deadline', date: '2025-10-28', color: '#f59e0b' },
                { id: 8, type: 'Holiday', title: 'Republic Day', description: 'National Holiday', date: '2025-01-26', color: '#8b5cf6' },
                { id: 9, type: 'Exam', title: 'English Literature Exam', description: 'CIE IGCSE Paper 1', date: '2025-11-15', color: '#ef4444' }
            ],
            communityQuestions: [
                { id: 1, subject: 'Mathematics', title: 'How to solve quadratic equations with complex roots?', body: 'I am stuck on a problem where the discriminant is negative...', userName: 'Ananya Reddy', userInitials: 'AR', time: '2 hours ago', answers: 5, upvotes: 12 },
                { id: 2, subject: 'Chemistry', title: 'Need help with balancing redox reactions', body: 'Can someone explain the half-reaction method?', userName: 'Rohan Gupta', userInitials: 'RG', time: '4 hours ago', answers: 3, upvotes: 8 },
                { id: 3, subject: 'English', title: 'Tips for writing a persuasive essay?', body: 'I have an essay due next week and need some guidance on structure...', userName: 'Kavya Iyer', userInitials: 'KI', time: '1 day ago', answers: 7, upvotes: 15 },
                { id: 4, subject: 'Physics', title: 'Confusion about Newton\'s third law', body: 'If action and reaction are equal, why do things move?', userName: 'Arjun Menon', userInitials: 'AM', time: '3 hours ago', answers: 10, upvotes: 20 },
                { id: 5, subject: 'Mathematics', title: 'Trigonometry identities help', body: 'How do I prove sin²x + cos²x = 1?', userName: 'Priyanka Das', userInitials: 'PD', time: '5 hours ago', answers: 6, upvotes: 9 },
                { id: 6, subject: 'Biology', title: 'Difference between mitosis and meiosis?', body: 'I always get confused between these two processes...', userName: 'Sanjay Verma', userInitials: 'SV', time: '6 hours ago', answers: 4, upvotes: 11 }
            ],
            mentors: [
                { id: 1, name: 'Priya Sharma', subject: 'Chemistry', initials: 'PS', lastMessage: 'Great work on the assignment!', unread: 2 },
                { id: 2, name: 'Amit Patel', subject: 'Mathematics', initials: 'AP', lastMessage: 'See you at the next session', unread: 0 },
                { id: 3, name: 'Neha Singh', subject: 'English', initials: 'NS', lastMessage: 'Your essay looks good', unread: 1 }
            ],
            mentorMessages: [],
            availableCoaches: {
                chemistry: [
                    { id: 1, name: 'Priya Sharma', rating: 4.8 },
                    { id: 2, name: 'Vikram Desai', rating: 4.7 }
                ],
                mathematics: [
                    { id: 3, name: 'Amit Patel', rating: 4.9 },
                    { id: 4, name: 'Sanjana Kumar', rating: 4.6 }
                ],
                english: [
                    { id: 5, name: 'Neha Singh', rating: 4.8 },
                    { id: 6, name: 'Rahul Verma', rating: 4.5 }
                ],
                physics: [
                    { id: 7, name: 'Arjun Nair', rating: 4.7 },
                    { id: 8, name: 'Meera Joshi', rating: 4.9 }
                ],
                biology: [
                    { id: 9, name: 'Divya Kapoor', rating: 4.6 },
                    { id: 10, name: 'Karthik Rao', rating: 4.8 }
                ]
            }
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
        filteredQuestions() {
            if (this.communityFilter === 'all') {
                return this.communityQuestions;
            }
            return this.communityQuestions.filter(q => q.subject.toLowerCase() === this.communityFilter);
        },
        filteredEvents() {
            if (this.eventFilter === 'all') {
                return this.calendarEvents;
            }
            return this.calendarEvents.filter(e => e.type.toLowerCase() === this.eventFilter);
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

                const dayEvents = this.calendarEvents.filter(event => {
                    const eventDate = new Date(event.date);
                    return eventDate.getDate() === currentDate.getDate() &&
                        eventDate.getMonth() === currentDate.getMonth() &&
                        eventDate.getFullYear() === currentDate.getFullYear();
                });

                days.push({
                    date: currentDate.toDateString(),
                    day: currentDate.getDate(),
                    isToday,
                    isCurrentMonth: currentDate.getMonth() === this.currentMonthIndex,
                    events: dayEvents
                });
            }

            return days;
        }
    },
    methods: {
        toggleHolidayMode() {
            this.holidayMode = !this.holidayMode;
            if (this.holidayMode) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        },
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        /* AI Page Methods */
        startNewChat() {
            this.aiMessages = [];
            this.aiInput = '';
            this.aiConversationHistory = [];
        },
        sendSuggestion(text) {
            this.aiInput = text;
            this.sendAiMessage();
        },
        /* OpenRouter Integration for AI Page */
        async sendAiMessage() {
            if (!this.aiInput.trim()) return;

            // 1. Add User Message
            const userMsg = {
                id: Date.now(),
                sender: 'user',
                content: this.aiInput
            };
            this.aiMessages.push(userMsg);

            const userText = this.aiInput;
            this.aiInput = ''; // Clear input
            this.scrollToAiBottom();

            // 2. Add AI Placeholder
            const aiMsgId = Date.now() + 1;
            this.aiMessages.push({
                id: aiMsgId,
                sender: 'ai',
                content: '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>'
            });
            this.scrollToAiBottom();
            this.aiIsTyping = true;

            // 3. Prepare Context
            // Update history for context window
            this.aiConversationHistory.push({ role: 'user', content: userText });

            // Limit history to last 10 messages to save tokens/context
            if (this.aiConversationHistory.length > 10) {
                this.aiConversationHistory = this.aiConversationHistory.slice(-10);
            }

            try {
                const apiKey = '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';
                const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

                const systemPrompt = {
                    role: 'system',
                    content: 'You are a helpful AI study buddy for a high school student. You explain complex topics simply, help with homework, and provide study tips. Use Markdown for formatting. Use LaTeX for math: $E=mc^2$ for inline, $$E=mc^2$$ for block.'
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
                                // Update message content in real-time
                                this.updateAiMessage(aiMsgId, aiContent);
                                this.scrollToAiBottom();
                            }
                        } catch (e) { }
                    }
                }

                // Final save to history
                this.aiConversationHistory.push({ role: 'assistant', content: aiContent });
                this.aiIsTyping = false;

            } catch (error) {
                console.error('AI Error:', error);
                this.updateAiMessage(aiMsgId, 'Sorry, I encounted an error. Please try again.');
                this.aiIsTyping = false;
            }
        },
        updateAiMessage(id, rawContent) {
            // Process Markdown and Math
            let htmlContent = this.renderMarkdown(rawContent);

            // Find message and update
            const index = this.aiMessages.findIndex(m => m.id === id);
            if (index !== -1) {
                this.aiMessages[index].content = htmlContent;
            }
        },
        renderMarkdown(text) {
            // 1. Math Rendering (Pre-process)
            // Replace block math $$...$$
            let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
                try { return katex.renderToString(expr, { displayMode: true }); }
                catch (e) { return match; }
            });

            // Replace inline math $...$
            processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, expr) => {
                try { return katex.renderToString(expr, { displayMode: false }); }
                catch (e) { return match; }
            });

            // 2. Markdown Rendering
            return marked.parse(processed);
        },
        scrollToAiBottom() {
            this.$nextTick(() => {
                const el = document.querySelector('.ai-messages-scroll');
                if (el) el.scrollTop = el.scrollHeight;
            });
        },
        joinMeeting() {
            const callId = 'chemistry-session-' + Date.now();
            window.location.href = `/tools/meeting?room=${callId}&name=Rahul Kumar`;
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
        async sendMessage() {
            if (this.chatInput.trim()) {
                this.chatMessages.push({
                    id: Date.now(),
                    sender: 'user',
                    content: this.chatInput
                });

                const userMessage = this.chatInput;
                this.chatInput = '';

                this.$nextTick(() => {
                    this.scrollToBottom();
                });

                // Simulate AI Typing
                this.isAiTyping = true;
                this.scrollToBottom();

                /* Simulate network delay */
                setTimeout(() => {
                    this.isAiTyping = false;
                    const aiResponse = this.generateAIResponse(userMessage); // Use the simple generator for demo

                    this.chatMessages.push({
                        id: Date.now() + 1,
                        sender: 'ai',
                        content: aiResponse
                    });

                    this.$nextTick(() => {
                        this.scrollToBottom();
                    });
                }, 1500);
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
        },
        getCoachesForSubject(subject) {
            return this.availableCoaches[subject] || [];
        },
        submitSchedule() {
            if (!this.scheduleForm.subject || !this.scheduleForm.coach || !this.scheduleForm.date || !this.scheduleForm.time) {
                alert('Please fill in all fields');
                return;
            }

            this.bookingDetails = {
                subject: this.scheduleForm.subject.charAt(0).toUpperCase() + this.scheduleForm.subject.slice(1),
                coach: this.scheduleForm.coach,
                date: this.scheduleForm.date,
                time: this.scheduleForm.time
            };

            this.showBookingConfirmation = true;

            this.scheduleForm = { subject: '', coach: '', date: '', time: '', reason: '' };
            if (this.flatpickrInstance) {
                this.flatpickrInstance.clear();
            }
        },
        initFlatpickr() {
            this.$nextTick(() => {
                const datepicker = document.getElementById('datepicker');
                if (datepicker && !this.flatpickrInstance) {
                    this.flatpickrInstance = flatpickr(datepicker, {
                        minDate: 'today',
                        dateFormat: 'F j, Y',
                        onChange: (selectedDates, dateStr) => {
                            this.scheduleForm.date = dateStr;
                        }
                    });
                }
            });
        },
        submitQuestion() {
            if (!this.newQuestion.subject || !this.newQuestion.title || !this.newQuestion.body) {
                alert('Please fill in all fields');
                return;
            }
            this.communityQuestions.unshift({
                id: Date.now(),
                subject: this.newQuestion.subject,
                title: this.newQuestion.title,
                body: this.newQuestion.body,
                userName: 'Rahul Kumar',
                userInitials: 'RK',
                time: 'Just now',
                answers: 0,
                upvotes: 0
            });
            this.newQuestion = { subject: '', title: '', body: '' };
            this.showAskQuestionModal = false;
        },
        selectMentor(mentor) {
            this.selectedMentor = mentor;

            const mentorConversations = {
                1: [
                    { id: 1, sender: 'mentor', content: 'Hi Rahul! Ready for today\'s organic chemistry session?', time: '9:15 AM' },
                    { id: 2, sender: 'user', content: 'Yes! I have some questions about functional groups', time: '9:18 AM' },
                    { id: 3, sender: 'mentor', content: 'Perfect! Functional groups are super important. Which ones are you finding tricky?', time: '9:19 AM' },
                    { id: 4, sender: 'user', content: 'I\'m confused between aldehydes and ketones', time: '9:21 AM' },
                    { id: 5, sender: 'mentor', content: 'Great question! Both have the carbonyl group (C=O), but aldehydes have it at the end of the chain, while ketones have it in the middle. The key difference is the position!', time: '9:23 AM' },
                    { id: 6, sender: 'user', content: 'That makes sense! Thanks for clarifying', time: '9:25 AM' },
                    { id: 7, sender: 'mentor', content: 'Great work on the assignment! You\'re really improving', time: 'Yesterday' }
                ],
                2: [
                    { id: 1, sender: 'mentor', content: 'Hey Rahul! How\'s the calculus practice going?', time: '2:30 PM' },
                    { id: 2, sender: 'user', content: 'Pretty good! But I\'m stuck on integration by parts', time: '2:35 PM' },
                    { id: 3, sender: 'mentor', content: 'No worries! Remember the formula: ∫u dv = uv - ∫v du. The trick is choosing the right u and dv.', time: '2:37 PM' },
                    { id: 4, sender: 'user', content: 'How do I know which to choose as u?', time: '2:40 PM' },
                    { id: 5, sender: 'mentor', content: 'Use the LIATE rule: Logarithmic, Inverse trig, Algebraic, Trig, Exponential. Choose u in that priority order!', time: '2:42 PM' },
                    { id: 6, sender: 'user', content: 'Oh that\'s helpful! Let me try some problems', time: '2:45 PM' },
                    { id: 7, sender: 'mentor', content: 'Sounds good! Message me if you get stuck', time: '2:46 PM' }
                ],
                3: [
                    { id: 1, sender: 'mentor', content: 'Hi Rahul! I reviewed your essay draft', time: '11:00 AM' },
                    { id: 2, sender: 'user', content: 'How did it look? Any feedback?', time: '11:05 AM' },
                    { id: 3, sender: 'mentor', content: 'Your thesis is strong and your arguments are well-structured! I\'d suggest adding more evidence in paragraph 3.', time: '11:07 AM' },
                    { id: 4, sender: 'user', content: 'Should I add more quotes or statistics?', time: '11:10 AM' },
                    { id: 5, sender: 'mentor', content: 'Both would work well! Statistics add credibility, and quotes can provide different perspectives. Try to balance them.', time: '11:12 AM' },
                    { id: 6, sender: 'user', content: 'Got it! I\'ll work on the revisions tonight', time: '11:15 AM' },
                    { id: 7, sender: 'mentor', content: 'Perfect! Send it over when you\'re done and I\'ll do another review', time: '11:16 AM' },
                    { id: 8, sender: 'mentor', content: 'Also, don\'t forget about the conclusion - make it impactful!', time: '11:17 AM' }
                ]
            };

            this.mentorMessages = mentorConversations[mentor.id] || [
                { id: 1, sender: 'mentor', content: 'Hi Rahul! How can I help you today?', time: '10:30 AM' }
            ];
        },
        sendMentorMessage() {
            if (this.mentorChatInput.trim() && this.selectedMentor) {
                this.mentorMessages.push({
                    id: Date.now(),
                    sender: 'user',
                    content: this.mentorChatInput,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                this.mentorChatInput = '';
                this.$nextTick(() => {
                    const container = this.$refs.mentorMessages;
                    if (container) container.scrollTop = container.scrollHeight;
                });
            }
        },
        createNewNote() {
            const newNote = {
                id: Date.now(),
                title: 'Untitled Note',
                content: '',
                preview: '',
                subject: 'General',
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
            this.notes.unshift(newNote);
            this.selectedNote = newNote;
            this.$nextTick(() => {
                if (this.$refs.notesEditor) {
                    this.$refs.notesEditor.innerHTML = '';
                }
            });
        },
        selectNote(note) {
            this.selectedNote = note;
            this.$nextTick(() => {
                if (this.$refs.notesEditor) {
                    this.$refs.notesEditor.innerHTML = note.content || '';
                }
            });
        },
        updateNoteContent() {
            if (this.selectedNote && this.$refs.notesEditor) {
                this.selectedNote.content = this.$refs.notesEditor.innerHTML;
                const text = this.$refs.notesEditor.innerText || '';
                this.selectedNote.preview = text.substring(0, 50);
            }
        },
        updateNotePreview() {
            if (this.selectedNote) {
                const text = this.$refs.notesEditor?.innerText || '';
                this.selectedNote.preview = text.substring(0, 50);
            }
        },
        formatText(command) {
            document.execCommand(command, false, null);
            this.$refs.notesEditor?.focus();
        },
        handleNotePaste(e) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        },
        acceptSuggestion() {
            if (this.selectedNote && this.aiNoteSuggestion) {
                const editor = this.$refs.notesEditor;
                if (editor) {
                    const suggestionHTML = `<div style="background: #EDF5FF; padding: 12px; border-radius: 8px; border-left: 3px solid #6a9ff5; margin: 16px 0;"><strong>✨ AI Summary:</strong><br>${this.aiNoteSuggestion.suggestion}</div>`;
                    editor.innerHTML += suggestionHTML;
                    this.updateNoteContent();
                }
                this.aiNoteSuggestion.dismissed = true;
            }
        },
        rejectSuggestion() {
            this.aiNoteSuggestion.dismissed = true;
        },
        selectWbTool(tool) {
            this.wbTool = tool;
        },
        clearWhiteboard() {
            if (this.whiteboardContext) {
                const canvas = this.$refs.whiteboardCanvas;
                this.whiteboardContext.clearRect(0, 0, canvas.width, canvas.height);
                this.wbHistory = [];
            }
        },
        undoWhiteboard() {
            if (this.wbHistory.length > 0) {
                this.wbHistory.pop();
                const canvas = this.$refs.whiteboardCanvas;
                this.whiteboardContext.clearRect(0, 0, canvas.width, canvas.height);
                this.wbHistory.forEach(imgData => {
                    this.whiteboardContext.putImageData(imgData, 0, 0);
                });
            }
        },
        saveWhiteboardState() {
            if (this.whiteboardContext) {
                const canvas = this.$refs.whiteboardCanvas;
                const imgData = this.whiteboardContext.getImageData(0, 0, canvas.width, canvas.height);
                this.wbHistory.push(imgData);
                if (this.wbHistory.length > 20) {
                    this.wbHistory.shift();
                }
            }
        },
        initWhiteboard() {
            const canvas = this.$refs.whiteboardCanvas;
            if (canvas) {
                canvas.width = canvas.offsetWidth || 800;
                canvas.height = canvas.offsetHeight || 600;
                this.whiteboardContext = canvas.getContext('2d');
                this.whiteboardContext.lineCap = 'round';
                this.whiteboardContext.lineJoin = 'round';

                if (!canvas.dataset.listenersAdded) {
                    let lastX = 0, lastY = 0;

                    canvas.addEventListener('mousedown', (e) => {
                        this.isDrawing = true;
                        const rect = canvas.getBoundingClientRect();
                        lastX = e.clientX - rect.left;
                        lastY = e.clientY - rect.top;
                        this.whiteboardContext.beginPath();
                        this.whiteboardContext.moveTo(lastX, lastY);
                    });

                    canvas.addEventListener('mousemove', (e) => {
                        if (this.isDrawing) {
                            const rect = canvas.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;

                            if (this.wbTool === 'eraser') {
                                this.whiteboardContext.globalCompositeOperation = 'destination-out';
                                this.whiteboardContext.lineWidth = 20;
                            } else {
                                this.whiteboardContext.globalCompositeOperation = 'source-over';
                                this.whiteboardContext.lineWidth = this.wbPenSize;

                                if (this.wbTool === 'highlighter') {
                                    this.whiteboardContext.globalAlpha = 0.3;
                                    this.whiteboardContext.lineWidth = this.wbPenSize * 3;
                                } else {
                                    this.whiteboardContext.globalAlpha = 1;
                                }

                                this.whiteboardContext.strokeStyle = this.wbColor;
                            }

                            this.whiteboardContext.lineTo(x, y);
                            this.whiteboardContext.stroke();
                            this.whiteboardContext.beginPath();
                            this.whiteboardContext.moveTo(x, y);

                            lastX = x;
                            lastY = y;
                        }
                    });

                    canvas.addEventListener('mouseup', () => {
                        if (this.isDrawing) {
                            this.isDrawing = false;
                            this.saveWhiteboardState();
                        }
                    });

                    canvas.addEventListener('mouseleave', () => {
                        if (this.isDrawing) {
                            this.isDrawing = false;
                            this.saveWhiteboardState();
                        }
                    });

                    canvas.dataset.listenersAdded = 'true';
                }
            }
        }
    },
    watch: {
        activeTab(newTab) {
            if (newTab === 'whiteboard') {
                this.$nextTick(() => {
                    this.initWhiteboard();
                });
            }
            if (newTab === 'schedule') {
                this.initFlatpickr();
            }
        },
        'scheduleForm.coach'() {
            this.initFlatpickr();
        },
        showWhiteboardPanel(isOpen) {
            if (isOpen) {
                this.$nextTick(() => {
                    this.initWhiteboard();
                });
            }
        }
    },
    mounted() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.holidayMode = true;
            document.body.classList.add('dark-mode');
        }

        if (this.activeTab === 'whiteboard') {
            this.$nextTick(() => {
                this.initWhiteboard();
            });
        }
    }
}).mount('#app');