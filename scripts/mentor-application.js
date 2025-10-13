const { createApp } = Vue;

createApp({
    data() {
        return {
            currentStep: 0,
            submitted: false,
            formData: {
                grade: null,
                subjects: [],
                numSubjects: null,
                freeDays: [],
                topicsConfidence: '',
                subjectConfidence: 4,
                leadership: 3,
                nurturing: 3,
                empathy: 3
            },
            gradeSubjects: {
                7: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education', 'Technology'],
                8: ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education', 'Technology', 'Health'],
                9: ['Algebra', 'Pre-Algebra', 'English', 'Biology', 'General Science', 'World History', 'Physical Education', 'Art', 'Foreign Language'],
                10: ['Geometry', 'Algebra II', 'English Literature', 'Chemistry', 'Biology', 'Modern History', 'Physical Education', 'Art', 'Foreign Language'],
                11: ['Pre-Calculus', 'Advanced Algebra', 'Advanced English', 'Physics', 'Chemistry', 'AP History', 'Government', 'Economics', 'Psychology', 'Foreign Language'],
                12: ['Calculus', 'Statistics', 'AP English', 'AP Physics', 'AP Chemistry', 'AP Biology', 'AP History', 'Government', 'Economics', 'Psychology', 'Foreign Language']
            }
        };
    },
    computed: {
        progress() {
            return ((this.currentStep - 1) / 8) * 100;
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
                    return this.formData.numSubjects !== null;
                case 4:
                    return this.formData.freeDays.length > 0;
                case 5:
                    return this.formData.topicsConfidence.trim().length > 0;
                case 6:
                case 7:
                case 8:
                case 9:
                    return true;
                default:
                    return false;
            }
        }
    },
    methods: {
        nextStep() {
            if (this.canProceed && this.currentStep < 9) {
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
                console.log('Coach Application Data:', this.formData);
                this.submitted = true;
                
                setTimeout(() => {
                    window.location.href = 'mentor-dashboard.html';
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