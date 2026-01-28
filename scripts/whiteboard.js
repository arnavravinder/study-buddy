const { createApp } = Vue;

createApp({
    data() {
        return {
            tool: 'pen',
            penColor: '#2D3748',
            penSize: 4,
            colors: [
                '#2D3748',
                '#E53E3E',
                '#DD6B20',
                '#D69E2E',
                '#38A169',
                '#3182CE',
                '#805AD5',
                '#D53F8C',
            ],
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            canvas: null,
            ctx: null,
            history: [],
            historyStep: -1
        };
    },
    mounted() {
        this.canvas = this.$refs.canvas;
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.loadWhiteboard();
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.resizeCanvas);
    },
    methods: {
        resizeCanvas() {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;

            if (this.history.length > 0) {
                this.restoreFromHistory();
            }
        },
        selectTool(tool) {
            this.tool = tool;
            if (tool === 'eraser') {
                this.canvas.classList.add('eraser-mode');
            } else {
                this.canvas.classList.remove('eraser-mode');
            }
        },
        setPenSize(size) {
            this.penSize = size;
        },
        setPenColor(color) {
            this.penColor = color;
            if (this.tool === 'eraser') {
                this.tool = 'pen';
                this.canvas.classList.remove('eraser-mode');
            }
        },
        getCoordinates(e) {
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches) {
                return {
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top
                };
            }
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        },
        startDrawing(e) {
            this.isDrawing = true;
            const coords = this.getCoordinates(e);
            this.lastX = coords.x;
            this.lastY = coords.y;

            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
        },
        draw(e) {
            if (!this.isDrawing) return;

            e.preventDefault();
            const coords = this.getCoordinates(e);

            this.ctx.lineWidth = this.penSize;

            if (this.tool === 'pen') {
                this.ctx.strokeStyle = this.penColor;
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.globalAlpha = 1;
            } else if (this.tool === 'highlighter') {
                this.ctx.strokeStyle = this.penColor;
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.globalAlpha = 0.3;
                this.ctx.lineWidth = this.penSize * 3;
            } else if (this.tool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.penSize * 4;
            }

            this.ctx.lineTo(coords.x, coords.y);
            this.ctx.stroke();

            this.lastX = coords.x;
            this.lastY = coords.y;
        },
        stopDrawing() {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.ctx.closePath();
                this.saveToHistory();
            }
        },
        handleTouchStart(e) {
            e.preventDefault();
            this.startDrawing(e);
        },
        handleTouchMove(e) {
            e.preventDefault();
            this.draw(e);
        },
        clearCanvas() {
            if (confirm('Are you sure you want to clear the whiteboard?')) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.history = [];
                this.historyStep = -1;
            }
        },
        saveToHistory() {
            this.history = this.history.slice(0, this.historyStep + 1);
            this.history.push(this.canvas.toDataURL());
            this.historyStep++;

            if (this.history.length > 50) {
                this.history.shift();
                this.historyStep--;
            }
        },
        restoreFromHistory() {
            if (this.historyStep >= 0 && this.history[this.historyStep]) {
                const img = new Image();
                img.src = this.history[this.historyStep];
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                };
            }
        },
        undo() {
            if (this.historyStep > 0) {
                this.historyStep--;
                this.restoreFromHistory();
            } else {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        },
        saveWhiteboard() {
            const dataURL = this.canvas.toDataURL();
            localStorage.setItem('studyBuddyWhiteboard', dataURL);
            localStorage.setItem('studyBuddyWhiteboardHistory', JSON.stringify({
                history: this.history,
                step: this.historyStep
            }));

            const btn = event.target.closest('.save-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-check"></i> Saved!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        },
        loadWhiteboard() {
            const saved = localStorage.getItem('studyBuddyWhiteboard');
            if (saved) {
                const img = new Image();
                img.src = saved;
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                };
            }

            const savedHistory = localStorage.getItem('studyBuddyWhiteboardHistory');
            if (savedHistory) {
                const data = JSON.parse(savedHistory);
                this.history = data.history;
                this.historyStep = data.step;
            }
        }
    }
}).mount('#app');
