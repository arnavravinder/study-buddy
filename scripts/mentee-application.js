const { createApp } = Vue;

createApp({
    data() {
        return {
            currentStep: 0,
            submitted: false,
            formData: {
                grade: null,
                subjects: [],
                freeDays: [],
                topics: '',
                currentGrade: null,
                subjectConfidence: 3,
                seniorComfort: 3
            },
            gradeSubjects: {
                6: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'],
                7: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education', 'Technology'],
                8: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education', 'Technology', 'Health'],
                9: ['Algebra', 'English', 'Biology', 'World History', 'Physical Education', 'Art', 'Foreign Language'],
                10: ['Geometry', 'English Literature', 'Chemistry', 'Modern History', 'Physical Education', 'Art', 'Foreign Language'],
                11: ['Pre-Calculus', 'Advanced English', 'Physics', 'Government', 'Economics', 'Psychology', 'Foreign Language']
            },
            gradeAverages: [
                { value: 'A+', label: 'A+ (97-100%)' },
                { value: 'A', label: 'A (93-96%)' },
                { value: 'A-', label: 'A- (90-92%)' },
                { value: 'B+', label: 'B+ (87-89%)' },
                { value: 'B', label: 'B (83-86%)' },
                { value: 'B-', label: 'B- (80-82%)' },
                { value: 'C+', label: 'C+ (77-79%)' },
                { value: 'C', label: 'C (73-76%)' },
                { value: 'C-', label: 'C- (70-72%)' },
                { value: 'D', label: 'D (60-69%)' },
                { value: 'F', label: 'F (Below 60%)' }
            ]
        };
    },
    computed: {
        progress() {
            return ((this.currentStep - 1) / 6) * 100;
        },
        availableSubjects() {
            return this.formData.grade ? this.gradeSubjects[this.formData.grade] : [];
        },
        canProceed() {
            switch (this.currentStep) {
                case 1:
                    return this.formData.grade !== null;
                case 2:
                    return this.formData.subjects.length > 0;
                case 3:
                    return this.formData.freeDays.length > 0;
                case 4:
                    return this.formData.topics.trim().length > 0;
                case 5:
                    return this.formData.currentGrade !== null;
                case 6:
                case 7:
                    return true;
                default:
                    return false;
            }
        }
    },
    methods: {
        nextStep() {
            if (this.canProceed && this.currentStep < 7) {
                this.currentStep++;
            }
        },
        previousStep() {
            if (this.currentStep > 1) {
                this.currentStep--;
            }
        },
        toggleSubject(subject) {
            const index = this.formData.subjects.indexOf(subject);
            if (index > -1) {
                this.formData.subjects.splice(index, 1);
            } else {
                this.formData.subjects.push(subject);
            }
        },
        toggleDay(day) {
            const index = this.formData.freeDays.indexOf(day);
            if (index > -1) {
                this.formData.freeDays.splice(index, 1);
            } else {
                this.formData.freeDays.push(day);
            }
        },
        startApplication() {
            this.currentStep = 1;
        },
        handleSubmit() {
            if (this.canProceed) {
                console.log('Student Application Data:', this.formData); // sending to the void for now
                this.submitted = true;

                setTimeout(() => {
                    window.location.href = '/mentee/dashboard/index.html';
                }, 3000);
            }
        }
    },
    mounted() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentStep === 0) {
                this.startApplication();
            }
        });
    }
}).mount('#app');