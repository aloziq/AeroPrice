# AeroPrice: Flight Price Prediction Engine

AeroPrice is an end-to-end Machine Learning project designed to predict domestic flight prices in India. This repository contains the complete pipeline—from exploratory data analysis and feature engineering to model serialization and hosting a live production website with an interactive price simulator.

---

## 📁 Project Structure

- **[main.ipynb]**: Jupyter notebook containing the data analysis, feature engineering, pipeline construction, model training, evaluation showdown, and model serialization.
- **[Clean_Dataset.csv]**: Preprocessed CSV file containing 300,153 domestic flight records in India.
- **[app.py]**: A lightweight Flask backend API server that loads the trained machine learning pipeline and handles real-time flight price predictions.
- **[site/]**: The frontend web dashboard containing [index.html], [style.css], and [app.js] to query the Flask API.
- **[presentation/]**: A premium HTML5/CSS3 slide deck presentation ([index.html]) to pitch the project and demonstrate model metrics interactively.
- **[best_model.joblib]** / **[best_model.pkl]**: Serialized Random Forest machine learning model pipelines (approx 1 GB each) containing both scaling preprocessing steps and the model weights.

---

## 🛠️ Prerequisites

To run the models and start the server, you need **Python 3.8+** installed. Install the required libraries using `pip`:

```bash
pip install numpy pandas matplotlib seaborn scikit-learn xgboost flask joblib
```

---

## 🚀 Step-by-Step Run Guide

Follow these steps to run the project from scratch:

### Step 1: Model Training & Serialization

To see how the models were evaluated and train the champion model yourself:

1. Open your terminal in the project directory and run Jupyter Notebook or JupyterLab:
   ```bash
   jupyter notebook
   ```
2. Open **[main.ipynb]**.
3. Run all cells sequentially. The notebook will:
   - Load the dataset from [Clean_Dataset.csv].
   - Perform Exploratory Data Analysis (EDA) and visualize pricing trends.
   - Apply log transformations (`np.log1p`) to the target variable (`price`).
   - Assemble a `ColumnTransformer` pipeline mapping numeric scalers (`StandardScaler`) and categorical mappings.
   - Train and evaluate seven different regression models (Linear Regression, KNN, Polynomial Regression, AdaBoost, XGBoost, Random Forest).
   - Save the best model (Random Forest, $R^2 = 98.83\%$) as **[best_model.joblib]** and **[best_model.pkl]**.

### Step 2: Launch the Flask Backend API Server

Once the model is trained and saved as `best_model.joblib` in the project root:

1. Start the Flask application by running:
   ```bash
   python app.py
   ```
2. The server will print messages loading the Random Forest pipeline. On Windows, it may take 10–15 seconds to load the 1GB model into memory.
3. Once loaded, you will see a message:
   `Running on http://127.0.0.1:5000/`

### Step 3: Open the Interactive Prediction Website

Once the server is running:

1. Open your web browser and navigate to:
   ```url
   http://127.0.0.1:5000/
   ```
2. This serves the frontend dashboard files from the [site/] directory.
3. Adjust sliders and dropdown menus for Travel Class (Business/Economy), Airline (Vistara, SpiceJet, Air India, etc.), Stops (Direct, 1 stop, 2+ stops), Booking Urgency, and Duration.
4. Click **Predict Price** to query the server backend API. The predicted price will display instantly in Indian Rupees (₹).

### Step 4: Open the Project Presentation Slide Deck

To review the project slides, design structures, and interactive evaluations:

1. Navigate to the [presentation/] folder.
2. Double-click the **[index.html]** file to open it directly in any web browser.
3. Use the arrow keys, spacebar, or the player controls to navigate through the project presentation deck. Toggle between Dark/Light modes or explore the custom prediction simulator widget on Slide 7.

---

## ⚙️ Backend API Endpoint Reference

The Flask application exposes a single API endpoint for price predictions:

### `POST /predict`

Submit query parameters to predict a flight price.

- **Content-Type**: `application/json`
- **Request Body Payload Example**:
  ```json
  {
    "class": "Economy",
    "airline": "Vistara",
    "stops": "zero",
    "days_left": 12,
    "duration": 2.5,
    "source_city": "Delhi",
    "destination_city": "Mumbai"
  }
  ```
- **Response Payload Example**:
  ```json
  {
      "status": "success",
      "input_data": { ... },
      "predicted_price_inr": 5940.0
  }
  ```
