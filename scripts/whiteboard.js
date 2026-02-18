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
            strokes: [],
            currentStroke: null,
            undoneStrokes: [],
            showAiModal: false,
            aiPrompt: '',
            aiStyle: 'notes',
            isAiDrawing: false
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
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.redrawAll();
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
            const coords = this.getCoordinates(e);
            if (this.tool === 'eraser') {
                this.isDrawing = true;
                this.eraseAtPoint(coords.x, coords.y);
                return;
            }
            this.isDrawing = true;
            this.lastX = coords.x;
            this.lastY = coords.y;
            this.currentStroke = {
                type: 'freehand',
                points: [{ x: coords.x, y: coords.y }],
                color: this.penColor,
                size: this.tool === 'highlighter' ? this.penSize * 3 : this.penSize,
                alpha: this.tool === 'highlighter' ? 0.3 : 1,
                tool: this.tool
            };
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
        },
        draw(e) {
            if (!this.isDrawing) return;
            e.preventDefault();
            const coords = this.getCoordinates(e);
            if (this.tool === 'eraser') {
                this.eraseAtPoint(coords.x, coords.y);
                return;
            }
            this.ctx.lineWidth = this.currentStroke.size;
            this.ctx.strokeStyle = this.currentStroke.color;
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = this.currentStroke.alpha;
            this.ctx.lineTo(coords.x, coords.y);
            this.ctx.stroke();
            this.currentStroke.points.push({ x: coords.x, y: coords.y });
            this.lastX = coords.x;
            this.lastY = coords.y;
        },
        stopDrawing() {
            if (this.isDrawing) {
                this.isDrawing = false;
                if (this.tool !== 'eraser' && this.currentStroke && this.currentStroke.points.length > 1) {
                    this.ctx.closePath();
                    this.strokes.push(this.currentStroke);
                    this.undoneStrokes = [];
                }
                this.currentStroke = null;
                this.ctx.globalAlpha = 1;
            }
        },
        eraseAtPoint(x, y) {
            const eraserRadius = this.penSize * 4;
            const toRemove = [];
            for (let i = 0; i < this.strokes.length; i++) {
                const stroke = this.strokes[i];
                if (stroke.type === 'freehand' && stroke.points) {
                    for (const pt of stroke.points) {
                        const dx = pt.x - x;
                        const dy = pt.y - y;
                        if (dx * dx + dy * dy <= (eraserRadius + stroke.size / 2) * (eraserRadius + stroke.size / 2)) {
                            toRemove.push(i);
                            break;
                        }
                    }
                } else if (stroke.type === 'ai') {
                    if (stroke.bounds) {
                        const b = stroke.bounds;
                        if (x >= b.x - eraserRadius && x <= b.x + b.w + eraserRadius &&
                            y >= b.y - eraserRadius && y <= b.y + b.h + eraserRadius) {
                            toRemove.push(i);
                        }
                    }
                }
            }
            if (toRemove.length > 0) {
                for (let i = toRemove.length - 1; i >= 0; i--) {
                    this.strokes.splice(toRemove[i], 1);
                }
                this.undoneStrokes = [];
                this.redrawAll();
            }
        },
        redrawAll() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const stroke of this.strokes) {
                if (stroke.type === 'freehand' && stroke.points && stroke.points.length > 1) {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = stroke.alpha || 1;
                    ctx.strokeStyle = stroke.color;
                    ctx.lineWidth = stroke.size;
                    ctx.beginPath();
                    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                    }
                    ctx.stroke();
                    ctx.closePath();
                } else if (stroke.type === 'ai' && stroke.imageData) {
                    const img = new Image();
                    img.src = stroke.imageData;
                    img.onload = () => {
                        ctx.globalAlpha = 1;
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.drawImage(img, 0, 0);
                    };
                }
            }
            ctx.globalAlpha = 1;
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
                this.strokes = [];
                this.undoneStrokes = [];
            }
        },
        undo() {
            if (this.strokes.length > 0) {
                this.undoneStrokes.push(this.strokes.pop());
                this.redrawAll();
            }
        },
        saveWhiteboard() {
            const dataURL = this.canvas.toDataURL();
            localStorage.setItem('studyBuddyWhiteboard', dataURL);
            localStorage.setItem('studyBuddyWhiteboardStrokes', JSON.stringify(this.strokes));
            const btn = event.target.closest('.save-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-check"></i> Saved!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        },
        loadWhiteboard() {
            const savedStrokes = localStorage.getItem('studyBuddyWhiteboardStrokes');
            if (savedStrokes) {
                try {
                    this.strokes = JSON.parse(savedStrokes);
                    this.redrawAll();
                    return;
                } catch (e) {}
            }
            const saved = localStorage.getItem('studyBuddyWhiteboard');
            if (saved) {
                const img = new Image();
                img.src = saved;
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                    this.strokes.push({
                        type: 'ai',
                        imageData: saved,
                        bounds: { x: 0, y: 0, w: this.canvas.width, h: this.canvas.height }
                    });
                };
            }
        },
        async generateAiDrawing() {
            if (!this.aiPrompt.trim()) return;
            this.showAiModal = false;
            this.isAiDrawing = true;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            const styleInstructions = {
                'notes': 'Create organized handwritten notes with titles, bullet points, and key terms. Use headers, subheaders, and indentation. Include divider lines between sections.',
                'diagram': 'Create a diagram with labeled shapes, arrows connecting concepts, and annotations. Use boxes, circles, and connecting lines.',
                'mindmap': 'Create a mind map with a central topic and branching subtopics. Use curved connecting lines and organized spatial layout.'
            }[this.aiStyle];
            const prompt = `You are an AI that generates whiteboard drawings as JSON stroke data. Generate content for: "${this.aiPrompt}"
Style: ${styleInstructions}
Canvas size: ${canvasWidth}x${canvasHeight} pixels. Use coordinates within these bounds with good margins (start around x:60, y:80).
Return ONLY valid JSON (no markdown, no explanation):
{
  "strokes": [
    {
      "type": "path",
      "points": [[x1,y1], [x2,y2], ...],
      "color": "#2D3748",
      "size": 3,
      "style": "pen"
    },
    {
      "type": "text",
      "content": "Text to write",
      "x": 100,
      "y": 100,
      "color": "#2D3748",
      "size": 24,
      "style": "handwritten"
    },
    {
      "type": "shape",
      "shape": "rect|circle|line|arrow",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "color": "#3182CE",
      "size": 2,
      "fill": false
    }
  ]
}
Guidelines for human-like handwriting:
- Vary sizes: titles (28-32), headers (22-26), body (16-20)
- Use colors meaningfully: titles in dark (#2D3748), highlights in colors (#E53E3E, #3182CE, #38A169)
- Add spacing between sections (40-60px vertical gaps)
- Include horizontal divider lines between major sections
- For bullet points, start with small dash paths
- Keep text readable - not too small
- Use the full canvas space, organized from top-left
Create educational, organized content that looks hand-drawn.`;
            try {
                const snapshotBefore = this.canvas.toDataURL();
                const response = await fetch("/api/ai/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "gemini-2.0-flash",
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                const data = await response.json();
                let jsonText = data.choices[0].message.content;
                jsonText = jsonText.replace(/```json\n?|```/g, '').trim();
                const drawingData = JSON.parse(jsonText);
                await this.renderAiStrokes(drawingData.strokes);
                const snapshotAfter = this.canvas.toDataURL();
                this.strokes.push({
                    type: 'ai',
                    imageData: snapshotAfter,
                    bounds: { x: 0, y: 0, w: this.canvas.width, h: this.canvas.height }
                });
                this.undoneStrokes = [];
            } catch (e) {
                console.error("AI Drawing error:", e);
                alert('Failed to generate drawing. Please try again.');
            } finally {
                this.isAiDrawing = false;
                this.aiPrompt = '';
            }
        },
        async renderAiStrokes(strokes) {
            for (const stroke of strokes) {
                await this.drawStroke(stroke);
                await this.sleep(50);
            }
        },
        async drawStroke(stroke) {
            const ctx = this.ctx;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            if (stroke.type === 'path' && stroke.points && stroke.points.length > 1) {
                ctx.strokeStyle = stroke.color || '#2D3748';
                ctx.lineWidth = stroke.size || 3;
                ctx.beginPath();
                const [startX, startY] = stroke.points[0];
                ctx.moveTo(startX + this.jitter(), startY + this.jitter());
                for (let i = 1; i < stroke.points.length; i++) {
                    const [x, y] = stroke.points[i];
                    ctx.lineTo(x + this.jitter(), y + this.jitter());
                    ctx.stroke();
                    await this.sleep(8);
                }
                ctx.closePath();
            }
            else if (stroke.type === 'text') {
                await this.drawHandwrittenText(
                    stroke.content,
                    stroke.x,
                    stroke.y,
                    stroke.color || '#2D3748',
                    stroke.size || 20
                );
            }
            else if (stroke.type === 'shape') {
                ctx.strokeStyle = stroke.color || '#2D3748';
                ctx.lineWidth = stroke.size || 2;
                if (stroke.shape === 'rect') {
                    await this.drawHanddrawnRect(stroke.x, stroke.y, stroke.width, stroke.height, stroke.fill);
                } else if (stroke.shape === 'circle') {
                    await this.drawHanddrawnCircle(stroke.x, stroke.y, stroke.width / 2);
                } else if (stroke.shape === 'line') {
                    await this.drawHanddrawnLine(stroke.x, stroke.y, stroke.x + stroke.width, stroke.y + (stroke.height || 0));
                } else if (stroke.shape === 'arrow') {
                    await this.drawHanddrawnArrow(stroke.x, stroke.y, stroke.x + stroke.width, stroke.y + (stroke.height || 0));
                }
            }
        },
        async drawHandwrittenText(text, x, y, color, size) {
            const ctx = this.ctx;
            ctx.font = `${size}px 'Segoe Script', 'Comic Sans MS', cursive`;
            ctx.fillStyle = color;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const offsetY = Math.sin(i * 0.3) * 1.5;
                const offsetX = i * (size * 0.55);
                ctx.fillText(char, x + offsetX + this.jitter(0.5), y + offsetY + this.jitter(0.5));
                await this.sleep(15);
            }
        },
        async drawHanddrawnRect(x, y, width, height, fill) {
            const ctx = this.ctx;
            const segments = 20;
            ctx.beginPath();
            ctx.moveTo(x + this.jitter(), y + this.jitter());
            for (let i = 0; i <= segments; i++) {
                ctx.lineTo(x + (width * i / segments) + this.jitter(), y + this.jitter());
            }
            for (let i = 0; i <= segments; i++) {
                ctx.lineTo(x + width + this.jitter(), y + (height * i / segments) + this.jitter());
            }
            for (let i = segments; i >= 0; i--) {
                ctx.lineTo(x + (width * i / segments) + this.jitter(), y + height + this.jitter());
            }
            for (let i = segments; i >= 0; i--) {
                ctx.lineTo(x + this.jitter(), y + (height * i / segments) + this.jitter());
            }
            if (fill) {
                ctx.globalAlpha = 0.1;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.stroke();
            ctx.closePath();
        },
        async drawHanddrawnCircle(cx, cy, radius) {
            const ctx = this.ctx;
            const points = 36;
            ctx.beginPath();
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const r = radius + this.jitter(2);
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.closePath();
        },
        async drawHanddrawnLine(x1, y1, x2, y2) {
            const ctx = this.ctx;
            const segments = 10;
            ctx.beginPath();
            ctx.moveTo(x1 + this.jitter(), y1 + this.jitter());
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const x = x1 + (x2 - x1) * t + this.jitter();
                const y = y1 + (y2 - y1) * t + this.jitter();
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.closePath();
        },
        async drawHanddrawnArrow(x1, y1, x2, y2) {
            await this.drawHanddrawnLine(x1, y1, x2, y2);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const headLen = 15;
            const ctx = this.ctx;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(
                x2 - headLen * Math.cos(angle - Math.PI / 6) + this.jitter(),
                y2 - headLen * Math.sin(angle - Math.PI / 6) + this.jitter()
            );
            ctx.moveTo(x2, y2);
            ctx.lineTo(
                x2 - headLen * Math.cos(angle + Math.PI / 6) + this.jitter(),
                y2 - headLen * Math.sin(angle + Math.PI / 6) + this.jitter()
            );
            ctx.stroke();
            ctx.closePath();
        },
        jitter(amount = 1) {
            return (Math.random() - 0.5) * amount * 2;
        },
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }
}).mount('#app');
