document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const tabPredBtn = document.getElementById('tab-pred-btn');
    const tabCreateBtn = document.getElementById('tab-create-btn');
    const predictorTabContent = document.getElementById('predictor-tab-content');
    const creatorTabContent = document.getElementById('creator-tab-content');

    // Tab Switching Logic
    tabPredBtn.addEventListener('click', () => switchTab('predictor'));
    tabCreateBtn.addEventListener('click', () => switchTab('creator'));

    function switchTab(tabName) {
        if (tabName === 'predictor') {
            tabPredBtn.classList.add('active');
            tabCreateBtn.classList.remove('active');
            predictorTabContent.style.display = 'grid';
            creatorTabContent.style.display = 'none';
        } else {
            tabCreateBtn.classList.add('active');
            tabPredBtn.classList.remove('active');
            creatorTabContent.style.display = 'grid';
            predictorTabContent.style.display = 'none';
            // Refresh ledger logs
            fetchSessionLedger();
        }
    }

    // ==========================================
    // 1. FARE PREDICTOR PANEL LOGIC
    // ==========================================
    const formPred = document.getElementById('prediction-form');
    const sourceCity = document.getElementById('source_city');
    const destinationCity = document.getElementById('destination_city');
    const swapBtn = document.getElementById('swap-route-btn');
    
    const daysLeftInput = document.getElementById('days_left');
    const daysLeftBadge = document.getElementById('days_left_badge');
    const durationInput = document.getElementById('duration');
    const durationBadge = document.getElementById('duration_badge');
    
    const stateEmpty = document.getElementById('results-empty');
    const stateLoading = document.getElementById('results-loading');
    const stateSuccess = document.getElementById('results-success');
    const stateError = document.getElementById('results-error');
    const loaderStatus = document.getElementById('loader-status');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    
    // Result elements
    const resClass = document.getElementById('res-class');
    const resAirline = document.getElementById('res-airline');
    const resSrcCode = document.getElementById('res-src-code');
    const resSrcName = document.getElementById('res-src-name');
    const resDstCode = document.getElementById('res-dst-code');
    const resDstName = document.getElementById('res-dst-name');
    const predictedPrice = document.getElementById('predicted-price');
    const dealRating = document.getElementById('deal-rating');
    const resDuration = document.getElementById('res-duration');
    const resStops = document.getElementById('res-stops');
    const resBookingWindow = document.getElementById('res-booking-window');
    const resTimeShift = document.getElementById('res-time-shift');
    const smartAdvice = document.getElementById('smart-advice');

    const cityCodes = {
        'Delhi': 'DEL', 'Mumbai': 'BOM', 'Bangalore': 'BLR',
        'Kolkata': 'CCU', 'Hyderabad': 'HYD', 'Chennai': 'MAA'
    };

    // Sliders sync
    daysLeftInput.addEventListener('input', (e) => {
        const val = e.target.value;
        daysLeftBadge.textContent = `${val} ${val == 1 ? 'Day' : 'Days'}`;
    });

    durationInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const hours = Math.floor(val);
        const mins = Math.round((val - hours) * 60);
        durationBadge.textContent = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    });

    // Swap Cities
    swapBtn.addEventListener('click', () => {
        const temp = sourceCity.value;
        sourceCity.value = destinationCity.value;
        destinationCity.value = temp;
        sourceCity.classList.add('swapped');
        destinationCity.classList.add('swapped');
        setTimeout(() => {
            sourceCity.classList.remove('swapped');
            destinationCity.classList.remove('swapped');
        }, 300);
    });

    // Predict form submission
    formPred.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (sourceCity.value === destinationCity.value) {
            alert("Source city and Destination city cannot be the same!");
            return;
        }

        const airline = document.querySelector('input[name="airline"]:checked').value;
        const airlineLabel = document.querySelector('input[name="airline"]:checked').closest('.airline-card').querySelector('span').textContent;
        const travelClass = document.querySelector('input[name="class"]:checked').value;
        const stops = document.querySelector('input[name="stops"]:checked').value;
        const departureTime = document.getElementById('departure_time').value;
        const arrivalTime = document.getElementById('arrival_time').value;
        const daysLeft = parseInt(daysLeftInput.value);
        const duration = parseFloat(durationInput.value);

        const payload = {
            airline: airline,
            source_city: sourceCity.value,
            destination_city: destinationCity.value,
            departure_time: departureTime,
            arrival_time: arrivalTime,
            stops: stops,
            class: travelClass,
            duration: duration,
            days_left: daysLeft
        };

        showState('loading');
        
        const messages = [
            "Parsing categorical variables...",
            "Computing binary & ordinal encodings...",
            "Synthesizing time shift and booking windows...",
            "Engineering duration minutes variable...",
            "Running ColumnTransformer & StandardScaler...",
            "Invoking Random Forest Regressor..."
        ];
        
        let msgIndex = 0;
        loaderStatus.textContent = messages[msgIndex];
        const messageInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % messages.length;
            loaderStatus.textContent = messages[msgIndex];
        }, 300);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            clearInterval(messageInterval);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Prediction request failed.");
            }

            const data = await response.json();
            displayResults(data, payload, airlineLabel);
            showState('success');

        } catch (error) {
            clearInterval(messageInterval);
            console.error(error);
            errorMessage.textContent = error.message || "Failed to make prediction. Make sure the backend is running.";
            showState('error');
        }
    });

    retryBtn.addEventListener('click', () => {
        formPred.dispatchEvent(new Event('submit'));
    });

    function showState(stateName) {
        stateEmpty.classList.remove('active');
        stateLoading.classList.remove('active');
        stateSuccess.classList.remove('active');
        stateError.classList.remove('active');
        
        if (stateName === 'empty') stateEmpty.classList.add('active');
        else if (stateName === 'loading') stateLoading.classList.add('active');
        else if (stateName === 'success') stateSuccess.classList.add('active');
        else if (stateName === 'error') stateError.classList.add('active');
    }

    function displayResults(data, payload, airlineLabel) {
        const price = Math.round(data.price);
        
        resClass.textContent = payload.class;
        resAirline.textContent = airlineLabel;
        resSrcCode.textContent = cityCodes[payload.source_city] || payload.source_city.substring(0,3).toUpperCase();
        resSrcName.textContent = payload.source_city;
        resDstCode.textContent = cityCodes[payload.destination_city] || payload.destination_city.substring(0,3).toUpperCase();
        resDstName.textContent = payload.destination_city;

        const plane = document.querySelector('.airplane-svg');
        if (plane) {
            plane.style.animation = 'none';
            void plane.offsetWidth; 
            plane.style.animation = null;
        }

        animatePriceCountUp(price);

        let ratingClass = 'fair';
        let ratingText = 'Fair Price';
        
        if (payload.class === 'Business') {
            if (price < 45000) { ratingClass = 'excellent'; ratingText = 'Excellent Deal'; }
            else if (price > 58000) { ratingClass = 'expensive'; ratingText = 'High Fare'; }
        } else {
            if (price < 5200) { ratingClass = 'excellent'; ratingText = 'Excellent Deal'; }
            else if (price > 7500) { ratingClass = 'expensive'; ratingText = 'High Fare'; }
        }
        
        dealRating.className = `deal-tag ${ratingClass}`;
        dealRating.textContent = ratingText;

        const hours = Math.floor(payload.duration);
        const mins = Math.round((payload.duration - hours) * 60);
        resDuration.textContent = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
        
        const stopsText = { 'zero': 'Direct', 'one': '1 Stop', 'two_or_more': '2+ Stops' };
        resStops.textContent = stopsText[payload.stops] || payload.stops;
        
        const bwText = ["Critical (1-7d)", "Next Week (8-14d)", "Saver (15-30d)", "Super Saver (31-60d)", "Advance (>60d)"];
        const bwIndex = payload.days_left <= 7 ? 0 : 
                        payload.days_left <= 14 ? 1 : 
                        payload.days_left <= 30 ? 2 : 
                        payload.days_left <= 60 ? 3 : 4;
        resBookingWindow.textContent = bwText[bwIndex];

        const timeOrder = { 'Early_Morning': 0, 'Morning': 1, 'Afternoon': 2, 'Evening': 3, 'Night': 4, 'Late_Night': 5 };
        const shiftVal = timeOrder[payload.arrival_time] - timeOrder[payload.departure_time];
        resTimeShift.textContent = shiftVal >= 0 ? `+${shiftVal} periods` : `${shiftVal} periods`;

        let advice = "";
        if (payload.days_left <= 7) {
            advice = `Critical booking window! Prices are spiked by ${payload.class === 'Economy' ? '₹2,500+' : '₹15,000+'} due to last-minute demand. For the next trip, target booking at least 15 days out.`;
        } else if (payload.days_left <= 14) {
            advice = `Entering the price-escalation zone. Rates will climb steadily each day. If your plans are locked, book this ${airlineLabel} flight now.`;
        } else {
            advice = `Excellent timing. You are booking in the stabilized 'Saver' window (${payload.days_left} days left). Prices rarely dip further, so this rate is highly optimal.`;
        }
        smartAdvice.textContent = advice;

        setTimeout(() => {
            drawTrendChart(price, payload.days_left, payload.class);
        }, 100);
    }

    function animatePriceCountUp(targetPrice) {
        let currentPrice = 0;
        const duration = 1000;
        const startTimestamp = performance.now();
        
        function step(timestamp) {
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = progress * (2 - progress);
            currentPrice = Math.floor(easeProgress * targetPrice);
            predictedPrice.textContent = currentPrice.toLocaleString('en-IN');
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                predictedPrice.textContent = targetPrice.toLocaleString('en-IN');
            }
        }
        window.requestAnimationFrame(step);
    }

    function drawTrendChart(currentPrice, selectedDays, travelClass) {
        const canvas = document.getElementById('price-trend-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = { top: 12, right: 20, bottom: 20, left: 45 };
        
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        let minPriceSim, maxPriceSim;
        if (travelClass === 'Business') {
            minPriceSim = currentPrice * 0.75;
            maxPriceSim = currentPrice * 1.5;
        } else {
            minPriceSim = currentPrice * 0.65;
            maxPriceSim = currentPrice * 1.8;
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridLines = 3;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            const gridVal = maxPriceSim - ((maxPriceSim - minPriceSim) / gridLines) * i;
            ctx.fillStyle = '#6b7280';
            ctx.font = '8px Plus Jakarta Sans';
            ctx.textAlign = 'right';
            ctx.fillText(`₹${Math.round(gridVal / 1000)}k`, padding.left - 6, y + 2.5);
        }
        
        const dataPoints = [];
        const daysToSimulate = [50, 40, 30, 20, 15, 12, 9, 7, 5, 3, 2, 1];
        
        function getX(days) {
            const ratio = (50 - days) / 49;
            return padding.left + ratio * chartWidth;
        }
        
        function getY(priceVal) {
            const ratio = (priceVal - minPriceSim) / (maxPriceSim - minPriceSim);
            return padding.top + chartHeight - ratio * chartHeight;
        }
        
        daysToSimulate.forEach(d => {
            let simPrice;
            if (travelClass === 'Business') {
                const multiplier = 1.0 + 0.3 * Math.exp(-d / 6);
                const baseline = currentPrice / (1.0 + 0.3 * Math.exp(-selectedDays / 6));
                simPrice = baseline * multiplier;
            } else {
                const multiplier = 1.0 + 0.65 * Math.exp(-d / 8) + 0.15 * (50 - d) / 50;
                const baseline = currentPrice / (1.0 + 0.65 * Math.exp(-selectedDays / 8) + 0.15 * (50 - selectedDays) / 50);
                simPrice = baseline * multiplier;
            }
            simPrice = Math.max(minPriceSim, Math.min(maxPriceSim, simPrice));
            
            dataPoints.push({
                days: d, price: simPrice, x: getX(d), y: getY(simPrice)
            });
        });

        const areaGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        areaGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        areaGrad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
        
        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(dataPoints[0].x, height - padding.bottom);
        dataPoints.forEach(pt => {
            ctx.lineTo(pt.x, pt.y);
        });
        ctx.lineTo(dataPoints[dataPoints.length - 1].x, height - padding.bottom);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dataPoints[0].x, dataPoints[0].y);
        for (let i = 1; i < dataPoints.length; i++) {
            const xc = (dataPoints[i].x + dataPoints[i-1].x) / 2;
            const yc = (dataPoints[i].y + dataPoints[i-1].y) / 2;
            ctx.quadraticCurveTo(dataPoints[i-1].x, dataPoints[i-1].y, xc, yc);
        }
        ctx.lineTo(dataPoints[dataPoints.length - 1].x, dataPoints[dataPoints.length - 1].y);
        ctx.stroke();

        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.font = '8px Plus Jakarta Sans';
        const labelDays = [50, 40, 30, 20, 10, 1];
        labelDays.forEach(d => {
            ctx.fillText(`${d}d`, getX(d), height - 4);
        });

        const currentX = getX(selectedDays);
        const currentY = getY(currentPrice);
        
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(currentX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(167, 139, 250, 0.3)';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#a78bfa';
        ctx.strokeStyle = '#070913';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }


    // ==========================================
    // 2. FLIGHT CREATOR PANEL LOGIC
    // ==========================================
    const formCreate = document.getElementById('creation-form');
    const cSourceCity = document.getElementById('create_source_city');
    const cDestinationCity = document.getElementById('create_destination_city');
    const cSwapBtn = document.getElementById('create-swap-route-btn');
    
    const cDaysLeftInput = document.getElementById('create_days_left');
    const cDaysLeftBadge = document.getElementById('create_days_left_badge');
    const cDurationInput = document.getElementById('create_duration');
    const cDurationBadge = document.getElementById('create_duration_badge');
    
    const ledgerCount = document.getElementById('ledger-count');
    const ledgerEmpty = document.getElementById('ledger-empty');
    const ledgerListContainer = document.getElementById('ledger-list-container');
    const ledgerList = document.getElementById('ledger-list');

    // Create Sliders sync
    cDaysLeftInput.addEventListener('input', (e) => {
        const val = e.target.value;
        cDaysLeftBadge.textContent = `${val} ${val == 1 ? 'Day' : 'Days'}`;
    });

    cDurationInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const hours = Math.floor(val);
        const mins = Math.round((val - hours) * 60);
        cDurationBadge.textContent = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
    });

    // Create Swap Cities
    cSwapBtn.addEventListener('click', () => {
        const temp = cSourceCity.value;
        cSourceCity.value = cDestinationCity.value;
        cDestinationCity.value = temp;
        cSourceCity.classList.add('swapped');
        cDestinationCity.classList.add('swapped');
        setTimeout(() => {
            cSourceCity.classList.remove('swapped');
            cDestinationCity.classList.remove('swapped');
        }, 300);
    });

    // Session log database state
    let registeredFlights = [];

    // Fetch ledger items from server
    async function fetchSessionLedger() {
        try {
            const response = await fetch('/created_flights');
            if (response.ok) {
                const data = await response.json();
                registeredFlights = data.flights;
                renderLedger();
            }
        } catch (err) {
            console.error("Error fetching session ledger:", err);
        }
    }

    // Submit Create Form
    formCreate.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (cSourceCity.value === cDestinationCity.value) {
            alert("Source city and Destination city cannot be the same!");
            return;
        }

        const flightNum = document.getElementById('create_flight_num').value.trim();
        
        const airline = document.querySelector('input[name="create_airline"]:checked').value;
        const travelClass = document.querySelector('input[name="create_class"]:checked').value;
        const stops = document.querySelector('input[name="create_stops"]:checked').value;
        const departureTime = document.getElementById('create_departure_time').value;
        const arrivalTime = document.getElementById('create_arrival_time').value;
        
        const daysLeft = parseInt(cDaysLeftInput.value);
        const duration = parseFloat(cDurationInput.value);

        const payload = {
            flight: flightNum,
            airline: airline,
            source_city: cSourceCity.value,
            destination_city: cDestinationCity.value,
            departure_time: departureTime,
            arrival_time: arrivalTime,
            stops: stops,
            class: travelClass,
            duration: duration,
            days_left: daysLeft
        };

        const submitBtn = document.getElementById('create-submit-btn');
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.querySelector('span').textContent = 'Inserting to CSV...';

        try {
            const response = await fetch('/create_flight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.querySelector('span').textContent = 'Save & Register Flight';

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Failed to save flight.");
            }

            const resData = await response.json();
            
            // Add to client array
            registeredFlights.unshift(resData.flight);
            renderLedger();

            // Clear inputs except route/airline defaults
            document.getElementById('create_flight_num').value = '';
            
            alert(`Success! Flight ${flightNum} simulated successfully with a predicted fare of ₹${resData.price.toLocaleString('en-IN')}.`);

        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.querySelector('span').textContent = 'Save & Register Flight';
            alert(`Error: ${err.message}`);
        }
    });

    // Render ledger DOM items
    function renderLedger() {
        ledgerCount.textContent = registeredFlights.length;
        
        if (registeredFlights.length === 0) {
            ledgerEmpty.style.display = 'block';
            ledgerListContainer.style.display = 'none';
            return;
        }

        ledgerEmpty.style.display = 'none';
        ledgerListContainer.style.display = 'block';
        
        ledgerList.innerHTML = '';
        
        registeredFlights.forEach(fl => {
            const li = document.createElement('li');
            li.className = 'ledger-item';
            
            const stopsText = fl.stops === 'zero' ? 'Nonstop' : fl.stops === 'one' ? '1 Stop' : '2+ Stops';
            
            li.innerHTML = `
                <div class="ledger-item-main">
                    <div class="ledger-item-header">
                        <div class="ledger-item-airline">
                            <span class="ledger-brand">${fl.airline.replace('_', ' ')}</span>
                            <span class="ledger-code">${fl.flight}</span>
                        </div>
                        <div class="ledger-item-price">₹${Math.round(fl.price).toLocaleString('en-IN')}</div>
                    </div>
                    
                    <div class="ledger-item-route">
                        <span class="ledger-airport">${cityCodes[fl.source_city] || fl.source_city.substring(0,3).toUpperCase()}</span>
                        <svg class="ledger-plane-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                            <polyline points="12 5 19 12 12 19"/>
                        </svg>
                        <span class="ledger-airport">${cityCodes[fl.destination_city] || fl.destination_city.substring(0,3).toUpperCase()}</span>
                    </div>

                    <div class="ledger-item-details">
                        <span>${fl.class}</span> • 
                        <span>${fl.duration}h</span> • 
                        <span>${stopsText}</span> • 
                        <span>${fl.days_left}d left</span>
                    </div>
                </div>
                <div class="ledger-success-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
            `;
            
            ledgerList.appendChild(li);
        });
    }

    // Call once at startup
    fetchSessionLedger();
});
