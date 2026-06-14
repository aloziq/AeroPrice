/**
 * AeroPrice ML - Presentation Application Script
 * Custom interactivity for model showcase, slide transitions, particle sky, and predictive sandbox.
 */

class PresentationApp {
    constructor() {
        // Slide State
        this.currentSlide = 0;
        this.totalSlides = 8;
        this.slides = [];
        
        // Autoplay State
        this.autoplayInterval = null;
        this.autoplayActive = false;
        this.autoplayDuration = 6000; // 6 seconds per slide
        
        // UI Elements Cache
        this.theme = 'dark';
        this.activeMetric = 'r2'; // Default chart metric
        
        // Model Evaluation Data
        this.modelsData = [
            { name: "Random Forest", r2: 0.9883, mae: 959, rmse: 2401, color: "var(--color-accent)" },
            { name: "K-Nearest Neighbors", r2: 0.9770, mae: 1682, rmse: 3372, color: "var(--color-primary)" },
            { name: "XGBoost", r2: 0.9741, mae: 2042, rmse: 3578, color: "var(--color-primary)" },
            { name: "Polynomial Reg.", r2: 0.9485, mae: 3022, rmse: 5046, color: "var(--text-secondary)" },
            { name: "AdaBoost", r2: 0.9414, mae: 3364, rmse: 5384, color: "var(--text-secondary)" },
            { name: "Linear Reg. + PCA", r2: 0.8726, mae: 4618, rmse: 7936, color: "var(--text-muted)" },
            { name: "Linear Reg. (No PCA)", r2: 0.8711, mae: 4536, rmse: 7983, color: "var(--text-muted)" }
        ];
        
        // Initialize App
        this.init();
    }

    init() {
        // Query elements
        this.slides = document.querySelectorAll('.slide');
        this.totalSlides = this.slides.length;
        
        // Create Navigation Dots
        this.createDots();
        
        // Setup Event Listeners
        this.setupEventListeners();
        
        // Start Canvas Particles
        this.initCanvasBackground();
        
        // Render Initial Metrics Chart
        this.renderMetricsChart();
        
        // Run initial simulator calculations
        this.runSimulatorPrediction();
        
        // Update slide UI
        this.updateSlideUI();
    }

    /* ==========================================================================
       SLIDE NAVIGATION CONTROLLER
       ========================================================================== */
    createDots() {
        const dotsContainer = document.getElementById('nav-dots');
        dotsContainer.innerHTML = '';
        for (let i = 0; i < this.totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `dot ${i === 0 ? 'active' : ''}`;
            dot.setAttribute('title', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => this.jumpToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    setupEventListeners() {
        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                this.nextSlide();
                this.stopAutoplay();
            } else if (e.key === 'ArrowLeft') {
                this.prevSlide();
                this.stopAutoplay();
            } else if (e.key === 'PageDown') {
                this.nextSlide();
            } else if (e.key === 'PageUp') {
                this.prevSlide();
            } else if (e.key === 'Home') {
                this.jumpToSlide(0);
            } else if (e.key === 'End') {
                this.jumpToSlide(this.totalSlides - 1);
            }
        });

        // Theme Toggle
        document.getElementById('btn-theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Fullscreen Toggle
        document.getElementById('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());

        // Autoplay Button
        document.getElementById('btn-autoplay').addEventListener('click', () => this.toggleAutoplay());

        // Handle window resizing
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Swipe gestures for touch screens
        let touchStartX = 0;
        let touchEndX = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, false);
    }

    handleSwipe(start, end) {
        const threshold = 50;
        if (start - end > threshold) {
            this.nextSlide(); // Swipe left -> next slide
            this.stopAutoplay();
        } else if (end - start > threshold) {
            this.prevSlide(); // Swipe right -> prev slide
            this.stopAutoplay();
        }
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.updateSlideUI();
        } else {
            // Loop back to title if autoplay is active
            if (this.autoplayActive) {
                this.currentSlide = 0;
                this.updateSlideUI();
            }
        }
    }

    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateSlideUI();
        }
    }

    jumpToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.currentSlide = index;
            this.updateSlideUI();
            this.stopAutoplay();
        }
    }

    updateSlideUI() {
        // Update Slides Active classes
        this.slides.forEach((slide, idx) => {
            slide.className = 'slide';
            if (idx === this.currentSlide) {
                slide.classList.add('active');
            } else if (idx < this.currentSlide) {
                slide.classList.add('prev-slide');
            }
        });

        // Update Dots
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx === this.currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update Counter
        document.getElementById('current-slide-num').innerText = this.currentSlide + 1;
        document.getElementById('total-slide-num').innerText = this.totalSlides;

        // Update Progress Bar
        const percentage = (this.currentSlide / (this.totalSlides - 1)) * 100;
        document.getElementById('progress-bar').style.width = `${percentage}%`;

        // If entering the evaluation slide, trigger chart animations
        if (this.currentSlide === 3) {
            setTimeout(() => this.renderMetricsChart(), 100);
        }
    }

    /* ==========================================================================
       AUTOPLAY PLAYER
       ========================================================================== */
    toggleAutoplay() {
        if (this.autoplayActive) {
            this.stopAutoplay();
        } else {
            this.startAutoplay();
        }
    }

    startAutoplay() {
        this.autoplayActive = true;
        
        // Update UI state
        const btn = document.getElementById('btn-autoplay');
        btn.querySelector('.play-icon').classList.add('hidden');
        btn.querySelector('.pause-icon').classList.remove('hidden');
        btn.querySelector('.autoplay-txt').innerText = "Pause";
        btn.style.borderColor = "var(--color-primary)";
        btn.style.color = "var(--color-primary)";

        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoplayDuration);
    }

    stopAutoplay() {
        if (!this.autoplayActive) return;
        this.autoplayActive = false;
        
        // Update UI state
        const btn = document.getElementById('btn-autoplay');
        btn.querySelector('.play-icon').classList.remove('hidden');
        btn.querySelector('.pause-icon').classList.add('hidden');
        btn.querySelector('.autoplay-txt').innerText = "Play";
        btn.style.borderColor = "var(--glass-border)";
        btn.style.color = "var(--text-secondary)";

        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

    /* ==========================================================================
       FULLSCREEN AND THEME CONTROLS
       ========================================================================== */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error enabling fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    toggleTheme() {
        const body = document.body;
        if (this.theme === 'dark') {
            this.theme = 'light';
            body.setAttribute('data-theme', 'light');
            document.getElementById('btn-theme-toggle').querySelector('svg').style.color = 'var(--color-primary)';
        } else {
            this.theme = 'dark';
            body.removeAttribute('data-theme');
            document.getElementById('btn-theme-toggle').querySelector('svg').style.color = 'currentColor';
        }
        
        // Redraw current slide metrics chart with updated CSS variables colors
        if (this.currentSlide === 3) {
            this.renderMetricsChart();
        }
    }

    /* ==========================================================================
       FEATURE PREPROCESSING TAB SWITCHER
       ========================================================================== */
    switchTab(group, index) {
        // Only handles "features" tab group for now
        if (group === 'features') {
            // Header buttons
            const buttons = document.querySelectorAll('#slide-features .tab-btn');
            buttons.forEach((btn, idx) => {
                if (idx === index) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Content panes
            const panes = document.querySelectorAll('#slide-features .tab-pane');
            panes.forEach((pane, idx) => {
                if (idx === index) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        }
    }

    /* ==========================================================================
       METRICS SVG COMPARISON CHART RENDERER
       ========================================================================== */
    updateChartMetric(metric) {
        this.activeMetric = metric;
        
        // Highlight active button
        const buttons = document.querySelectorAll('.btn-metric');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = document.getElementById(`btn-metric-${metric}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Update subtitle/annotation text
        const explanationEl = document.getElementById('metric-explanation');
        const chartTitleEl = document.getElementById('chart-title');
        
        if (metric === 'r2') {
            chartTitleEl.innerText = "Algorithm Showdown: R² Score";
            explanationEl.innerText = "R-squared (R²) indicates the percentage of flight price variation explained by the model's features. Higher is better (Target: 1.0).";
        } else if (metric === 'mae') {
            chartTitleEl.innerText = "Algorithm Showdown: Mean Absolute Error";
            explanationEl.innerText = "MAE represents the average absolute prediction error in Indian Rupees (₹). Lower error means closer price estimates.";
        } else if (metric === 'rmse') {
            chartTitleEl.innerText = "Algorithm Showdown: Root Mean Squared Error";
            explanationEl.innerText = "RMSE is the square root of the average squared discrepancies, heavily penalizing large errors. Lower is better.";
        }
        
        this.renderMetricsChart();
    }

    renderMetricsChart() {
        const svgContainer = document.getElementById('chart-bars-group');
        if (!svgContainer) return;
        
        // Clear previous elements
        svgContainer.innerHTML = '';
        
        const barHeight = 22;
        const barSpacing = 36;
        const startY = 32;
        const startBarX = 160;
        const maxBarWidth = 300; // pixels wide
        
        // Find best values for scaling
        let maxVal = 1;
        if (this.activeMetric === 'mae') {
            maxVal = Math.max(...this.modelsData.map(m => m.mae));
        } else if (this.activeMetric === 'rmse') {
            maxVal = Math.max(...this.modelsData.map(m => m.rmse));
        }
        
        this.modelsData.forEach((model, idx) => {
            const y = startY + idx * barSpacing;
            
            // Calculate width percentage
            let val = 0;
            let displayValStr = "";
            let width = 0;
            
            if (this.activeMetric === 'r2') {
                val = model.r2;
                width = val * maxBarWidth;
                displayValStr = `${(val * 100).toFixed(2)}%`;
            } else if (this.activeMetric === 'mae') {
                val = model.mae;
                // Inverse scale for MAE: lower is longer/better visual, or standard direct mapping?
                // Standard direct mapping: show larger errors as longer bars, but highlight Random Forest's tiny error!
                // To keep visualization consistent (longer bar = better model), let's map: width = (1 - (val/maxVal)) * maxBarWidth.
                // Wait! Let's do standard direct bar length so the size of the error stands out visually, but color RF in Green!
                width = (val / maxVal) * maxBarWidth;
                displayValStr = `₹${val.toLocaleString()}`;
            } else if (this.activeMetric === 'rmse') {
                val = model.rmse;
                width = (val / maxVal) * maxBarWidth;
                displayValStr = `₹${val.toLocaleString()}`;
            }
            
            // Create SVG Group
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            // Model Label
            const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textLabel.setAttribute('x', '15');
            textLabel.setAttribute('y', (y + barHeight/2 + 4).toString());
            textLabel.setAttribute('class', 'chart-label');
            textLabel.textContent = model.name;
            g.appendChild(textLabel);
            
            // Bar Background Track
            const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bgRect.setAttribute('x', startBarX.toString());
            bgRect.setAttribute('y', y.toString());
            bgRect.setAttribute('width', maxBarWidth.toString());
            bgRect.setAttribute('height', barHeight.toString());
            bgRect.setAttribute('rx', '4');
            bgRect.setAttribute('fill', 'rgba(255, 255, 255, 0.02)');
            g.appendChild(bgRect);
            
            // Active Bar Fill
            const fillRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            fillRect.setAttribute('x', startBarX.toString());
            fillRect.setAttribute('y', y.toString());
            fillRect.setAttribute('width', '0'); // Start at 0 for entrance animation
            fillRect.setAttribute('height', barHeight.toString());
            fillRect.setAttribute('rx', '4');
            
            // Apply customized color/highlight for the champion
            if (model.name === "Random Forest") {
                fillRect.setAttribute('fill', 'var(--color-accent)');
                fillRect.style.filter = "drop-shadow(0 0 4px var(--color-accent-glow))";
            } else if (model.name.includes("Linear Reg")) {
                fillRect.setAttribute('fill', 'rgba(148, 163, 184, 0.4)');
            } else {
                fillRect.setAttribute('fill', 'var(--color-primary)');
            }
            
            fillRect.setAttribute('class', 'chart-bar');
            g.appendChild(fillRect);
            
            // Value Label
            const textVal = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            // Position value label right after the bar width, but wait, since it's animated, let's place it at a fixed margin or animate it
            textVal.setAttribute('x', (startBarX + width + 10).toString());
            textVal.setAttribute('y', (y + barHeight/2 + 4).toString());
            textVal.setAttribute('class', 'chart-value');
            textVal.style.opacity = '0';
            textVal.style.transition = 'opacity 0.5s ease 0.4s';
            textVal.textContent = displayValStr;
            g.appendChild(textVal);
            
            svgContainer.appendChild(g);
            
            // Trigger animation on next paint loop
            requestAnimationFrame(() => {
                setTimeout(() => {
                    fillRect.setAttribute('width', width.toString());
                    textVal.style.opacity = '1';
                }, 50);
            });
        });
    }

    /* ==========================================================================
       INTERACTIVE PLAYGROUND FLIGHT PRICE SIMULATOR
       ========================================================================== */
    runSimulatorPrediction() {
        // Grab inputs
        const travelClass = document.getElementById('sim-class').value;
        const airline = document.getElementById('sim-airline').value;
        const stops = document.getElementById('sim-stops').value;
        const route = document.getElementById('sim-route').value;
        const daysLeft = parseInt(document.getElementById('sim-days').value);
        const duration = parseFloat(document.getElementById('sim-duration').value);

        // Update UI sliders text indicators
        document.getElementById('sim-days-val').innerText = `${daysLeft} days`;
        document.getElementById('sim-duration-val').innerText = `${duration} hrs`;

        // Calculate approximation formula based on Model Coefficients & weights
        // Base rate: Economy starts at ₹2,500, Business starts at ₹32,000 (huge offset)
        let baseFare = 2800;
        let classMultiplier = 1;
        let classSurcharge = 0;

        if (travelClass === 'Business') {
            classSurcharge = 31500;
            baseFare = 24000; // base Business rate
        }

        // Airline Markup / Discounts
        let airlineMod = 0;
        if (airline === 'Vistara') {
            airlineMod = travelClass === 'Business' ? 12500 : 2500;
        } else if (airline === 'Air_India') {
            airlineMod = travelClass === 'Business' ? 8200 : 1800;
        } else if (airline === 'Indigo') {
            airlineMod = -400;
        } else if (airline === 'SpiceJet') {
            airlineMod = -900;
        } else if (airline === 'GO_FIRST') {
            airlineMod = -600;
        }

        // Stops modifier
        let stopsMod = 0;
        if (stops === 'one') {
            stopsMod = 2800;
        } else if (stops === 'two_or_more') {
            stopsMod = 4500;
        }

        // Duration modifier
        let durationMod = Math.round(duration * 220);

        // Days left (Urgency pricing) - Exponential escalation near 1-7 days left
        let urgencyMod = 0;
        if (daysLeft <= 7) {
            // Escalate up to ₹9,500 for 1 day remaining
            urgencyMod = Math.round(Math.pow((8 - daysLeft) / 7, 1.8) * 8800);
        } else if (daysLeft <= 14) {
            urgencyMod = Math.round((15 - daysLeft) * 350 + 2000);
        } else if (daysLeft <= 30) {
            urgencyMod = Math.round((31 - daysLeft) * 100 + 400);
        } else {
            // Early bird discount
            urgencyMod = -Math.round((daysLeft - 30) * 40);
        }

        // Route specifics
        let routeMod = 0;
        if (route === 'DEL_BOM') routeMod = 200;
        else if (route === 'DEL_CCU') routeMod = 800;
        else if (route === 'BOM_CCU') routeMod = 1200;
        else if (route === 'BLR_DEL') routeMod = 600;
        else if (route === 'HYD_MAA') routeMod = -300;

        // Calculate Totals
        let baseDisplay = baseFare + classSurcharge;
        let finalEst = baseDisplay + airlineMod + urgencyMod + stopsMod + durationMod + routeMod;

        // Ensure reasonable minimums (no negative flight tickets)
        if (travelClass === 'Economy' && finalEst < 1100) finalEst = 1100;
        if (travelClass === 'Business' && finalEst < 12000) finalEst = 12000;

        // Update GUI
        // Price Counter animation
        const priceOutEl = document.getElementById('sim-price-out');
        const startVal = parseInt(priceOutEl.innerText.replace(/,/g, '')) || 0;
        this.animatePriceCounter(priceOutEl, startVal, finalEst, 400);

        // Breakdown panel
        document.getElementById('breakdown-base').innerText = `₹${baseDisplay.toLocaleString()}`;
        
        const airSign = airlineMod >= 0 ? '+' : '';
        document.getElementById('breakdown-airline').innerText = `${airSign}₹${airlineMod.toLocaleString()}`;
        document.getElementById('breakdown-airline').className = `text-right ${airlineMod >= 0 ? 'text-emerald' : 'text-rose'}`;

        const urgSign = urgencyMod >= 0 ? '+' : '';
        document.getElementById('breakdown-days').innerText = `${urgSign}₹${urgencyMod.toLocaleString()}`;
        document.getElementById('breakdown-days').className = `text-right ${urgencyMod >= 0 ? 'text-emerald' : 'text-rose'}`;

        document.getElementById('breakdown-stops').innerText = `+₹${stopsMod.toLocaleString()}`;
        
        document.getElementById('breakdown-duration').innerText = `+₹${durationMod.toLocaleString()}`;
        
        document.getElementById('breakdown-total').innerText = `₹${finalEst.toLocaleString()}`;
    }

    animatePriceCounter(element, start, end, duration) {
        if (start === end) {
            element.innerText = end.toLocaleString();
            return;
        }
        
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= duration) {
                element.innerText = end.toLocaleString();
                return;
            }
            
            // Ease out quad formula
            const progress = elapsedTime / duration;
            const easeProgress = progress * (2 - progress);
            const currentVal = Math.round(start + (end - start) * easeProgress);
            
            element.innerText = currentVal.toLocaleString();
            requestAnimationFrame(updateCounter);
        };
        
        requestAnimationFrame(updateCounter);
    }

    /* ==========================================================================
       CANVAS SPACE/PARTICLE BACKGROUND
       ========================================================================== */
    initCanvasBackground() {
        this.canvas = document.getElementById('canvas-bg');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        
        this.particles = [];
        this.particleCount = 40;
        
        // Flight lines
        this.flightPaths = [];
        this.flightPathCount = 4;

        // Initialize points
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                alpha: Math.random() * 0.5 + 0.2
            });
        }

        // Initialize curves mimicking flight trajectories
        for (let i = 0; i < this.flightPathCount; i++) {
            this.resetFlightPath(i);
        }

        // Start animation loop
        this.animateCanvas();
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    resetFlightPath(index) {
        const startLeft = Math.random() > 0.5;
        
        // Define curved path points
        const startX = startLeft ? -50 : this.canvas.width + 50;
        const startY = Math.random() * (this.canvas.height * 0.6) + this.canvas.height * 0.2;
        
        const endX = startLeft ? this.canvas.width + 50 : -50;
        const endY = Math.random() * (this.canvas.height * 0.6) + this.canvas.height * 0.2;
        
        const controlX = this.canvas.width / 2 + (Math.random() - 0.5) * 200;
        const controlY = Math.random() * (this.canvas.height * 0.3) - 100; // curvature upwards

        this.flightPaths[index] = {
            startX, startY,
            controlX, controlY,
            endX, endY,
            progress: Math.random(), // Random initial offset
            speed: Math.random() * 0.0006 + 0.0003,
            color: index % 2 === 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(244, 63, 94, 0.12)',
            planeColor: index % 2 === 0 ? 'rgba(99, 102, 241, 0.5)' : 'rgba(244, 63, 94, 0.4)'
        };
    }

    getBezierPoint(p, t) {
        // Calculate point on quadratic bezier curve
        const x = (1 - t) * (1 - t) * p.startX + 2 * (1 - t) * t * p.controlX + t * t * p.endX;
        const y = (1 - t) * (1 - t) * p.startY + 2 * (1 - t) * t * p.controlY + t * t * p.endY;
        return { x, y };
    }

    animateCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const isDark = (this.theme === 'dark');

        // Draw stars/particles
        this.ctx.fillStyle = isDark ? '#ffffff' : '#4f46e5';
        for (let i = 0; i < this.particleCount; i++) {
            const p = this.particles[i];
            
            this.ctx.beginPath();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Move particles
            p.x += p.vx;
            p.y += p.vy;
            
            // Loop screen borders
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
        }

        // Draw flight lines
        for (let i = 0; i < this.flightPathCount; i++) {
            const path = this.flightPaths[i];
            
            // Draw dotted/solid line path
            this.ctx.beginPath();
            this.ctx.strokeStyle = path.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([5, 8]);
            
            this.ctx.moveTo(path.startX, path.startY);
            this.ctx.quadraticCurveTo(path.controlX, path.controlY, path.endX, path.endY);
            this.ctx.stroke();
            
            // Calculate airplane position on curve
            const pos = this.getBezierPoint(path, path.progress);
            
            // Draw airplane glow point
            this.ctx.beginPath();
            this.ctx.fillStyle = path.planeColor;
            this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw glowing halo
            const grad = this.ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, 15);
            grad.addColorStop(0, path.planeColor);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Advance progress
            path.progress += path.speed;
            
            // Reset when done
            if (path.progress >= 1.0) {
                this.resetFlightPath(i);
                path.progress = 0;
            }
        }
        
        // Reset defaults
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;

        requestAnimationFrame(() => this.animateCanvas());
    }
}

// Instantiate App globally
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new PresentationApp();
    window.app = app; // Expose to global scope for HTML inline clicks
});
