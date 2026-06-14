import os
import sys
import traceback
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify, send_from_directory

# Configure output encoding for Windows terminal
try:
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

app = Flask(__name__, static_folder='site')

MODEL_PATH = 'best_model.joblib'
model = None

# In-memory session logging (no CSV persistence)
flight_id_counter = 0
session_created_flights = []

# Load the model on start
try:
    print(f"Loading Random Forest model from {MODEL_PATH}... (this can take up to 15 seconds)", flush=True)
    model = joblib.load(MODEL_PATH)
    print("Model loaded successfully and ready for predictions!", flush=True)
except Exception as e:
    print(f"CRITICAL ERROR loading model: {str(e)}", flush=True)
    traceback.print_exc()

@app.route('/')
def index():
    return send_from_directory('site', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('site', path)

# Helper function to predict price using the pipeline model
def run_model_prediction(data):
    if model is None:
        raise ValueError("Machine learning model is not loaded on server.")
        
    days_left = int(data.get('days_left', 15))
    travel_class = data.get('class', 'Economy')
    stops = data.get('stops', 'zero')
    departure_time = data.get('departure_time', 'Morning')
    arrival_time = data.get('arrival_time', 'Evening')
    airline = data.get('airline', 'Air_India')
    source_city = data.get('source_city', 'Delhi')
    destination_city = data.get('destination_city', 'Mumbai')
    duration = float(data.get('duration', 2.5))
    
    # Recreate categorical mappings
    class_encoded = 0 if travel_class == 'Economy' else 1
    stops_map = {'zero': 0, 'one': 1, 'two_or_more': 2}
    stops_encoded = stops_map.get(stops, 0)
    
    time_map = {
        'Early_Morning': 0, 'Morning': 1, 'Afternoon': 2,
        'Evening': 3, 'Night': 4, 'Late_Night': 5
    }
    dep_time_encoded = time_map.get(departure_time, 1)
    arr_time_encoded = time_map.get(arrival_time, 3)
    
    duration_mins = int(duration * 60)
    is_direct = 1 if stops_encoded == 0 else 0
    
    if days_left <= 7:
        booking_window = 0
    elif days_left <= 14:
        booking_window = 1
    elif days_left <= 30:
        booking_window = 2
    elif days_left <= 60:
        booking_window = 3
    else:
        booking_window = 4
        
    time_shift = arr_time_encoded - dep_time_encoded
    
    features = {col: 0 for col in model.feature_names_in_}
    features['days_left'] = days_left
    features['class_encoded'] = class_encoded
    features['stops_encoded'] = stops_encoded
    features['dep_time_encoded'] = dep_time_encoded
    features['arr_time_encoded'] = arr_time_encoded
    features['duration_mins'] = duration_mins
    features['is_direct'] = is_direct
    features['booking_window'] = booking_window
    features['time_shift'] = time_shift
    
    airline_col = f'airline_{airline}'
    if airline_col in features:
        features[airline_col] = 1
        
    source_col = f'source_city_{source_city}'
    if source_col in features:
        features[source_col] = 1
        
    dest_col = f'destination_city_{destination_city}'
    if dest_col in features:
        features[dest_col] = 1
        
    df = pd.DataFrame([features], columns=list(model.feature_names_in_))
    log_price = model.predict(df)[0]
    predicted_fare = np.expm1(log_price)
    predicted_fare = max(0.0, predicted_fare)
    
    return float(predicted_fare)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
            
        predicted_fare = run_model_prediction(data)
        
        return jsonify({
            'success': True,
            'price': predicted_fare
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/create_flight', methods=['POST'])
def create_flight():
    global flight_id_counter, session_created_flights
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No flight data provided'}), 400
            
        # Extract variables
        airline = data.get('airline', 'Air_India')
        flight_num = data.get('flight', 'AI-101').strip().upper()
        source_city = data.get('source_city', 'Delhi')
        departure_time = data.get('departure_time', 'Morning')
        stops = data.get('stops', 'zero')
        arrival_time = data.get('arrival_time', 'Evening')
        destination_city = data.get('destination_city', 'Mumbai')
        travel_class = data.get('class', 'Economy')
        duration = float(data.get('duration', 2.5))
        days_left = int(data.get('days_left', 15))
        
        # Basic validation
        if not flight_num:
            return jsonify({'success': False, 'error': 'Flight number is required'}), 400
        if source_city == destination_city:
            return jsonify({'success': False, 'error': 'Source and destination cities must be different'}), 400
            
        # Predict ticket price using our model pipeline
        try:
            predicted_fare = run_model_prediction(data)
            price = round(predicted_fare, 2)
        except Exception as pred_err:
            return jsonify({'success': False, 'error': f'Model prediction failed: {str(pred_err)}'}), 500
            
        # Generate session ticket ID
        flight_id_counter += 1
        new_row_id = flight_id_counter
                
        # Append only to in-memory session ledger (no CSV file modification)
        flight_record = {
            'id': new_row_id,
            'airline': airline,
            'flight': flight_num,
            'source_city': source_city,
            'departure_time': departure_time,
            'stops': stops,
            'arrival_time': arrival_time,
            'destination_city': destination_city,
            'class': travel_class,
            'duration': duration,
            'days_left': days_left,
            'price': price
        }
        session_created_flights.insert(0, flight_record)
        
        print(f"Showcase flight registered in-memory: ID #{new_row_id} with predicted price ₹{price}", flush=True)
        
        return jsonify({
            'success': True,
            'inserted_id': new_row_id,
            'price': price,
            'flight': flight_record
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/created_flights', methods=['GET'])
def get_created_flights():
    global session_created_flights
    return jsonify({
        'success': True,
        'count': len(session_created_flights),
        'flights': session_created_flights
    })

if __name__ == '__main__':
    # Default Flask local development port using port 8080
    app.run(host='127.0.0.1', port=8080, debug=True)
