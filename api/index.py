from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
import json

app = Flask(__name__)

@app.route('/api/ml/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'records' not in data:
            return jsonify({"error": "No records provided"}), 400

        records = data['records']
        if len(records) < 5:
            return jsonify({"error": "Not enough data points. Minimum 5 required."}), 400

        # Convert to pandas DataFrame
        df = pd.DataFrame(records)
        
        # Ensure timestamp is numeric (it should be unix timestamp)
        df['timestamp'] = pd.to_numeric(df['timestamp'])
        df['temp'] = pd.to_numeric(df['temp'])
        df['humidity'] = pd.to_numeric(df['humidity'])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')

        # === 1. Anomaly Detection (Isolation Forest) ===
        # Detect temperature anomalies
        features = df[['temp']]
        model_iso = IsolationForest(contamination=0.05, random_state=42)
        df['anomaly'] = model_iso.fit_predict(features)
        
        # Map: -1 is anomaly, 1 is normal -> Convert to boolean
        df['is_anomaly'] = df['anomaly'] == -1

        # === 2. Forecasting (Linear Regression) ===
        # Simple trend prediction for the next 5 intervals
        X = df[['timestamp']].values
        y_temp = df['temp'].values
        
        model_lr = LinearRegression()
        model_lr.fit(X, y_temp)

        # Calculate interval difference to predict next steps
        time_diffs = np.diff(X.flatten())
        avg_interval = np.mean(time_diffs) if len(time_diffs) > 0 else 60000

        last_time = df['timestamp'].iloc[-1]
        
        predictions = []
        for i in range(1, 13): # Predict next 12 steps
            next_time = last_time + (avg_interval * i)
            pred_temp = model_lr.predict([[next_time]])[0]
            predictions.append({
                "timestamp": int(next_time),
                "predicted_temp": round(float(pred_temp), 2)
            })

        # Calculate metrics
        avg_temp = df['temp'].mean()
        anomalies_count = df['is_anomaly'].sum()
        max_temp = df['temp'].max()
        min_temp = df['temp'].min()

        # Prepare response
        processed_records = df[['timestamp', 'temp', 'humidity', 'is_anomaly']].to_dict(orient='records')
        
        # Format for JSON
        for r in processed_records:
            r['is_anomaly'] = bool(r['is_anomaly'])

        return jsonify({
            "status": "success",
            "metrics": {
                "average_temp": round(float(avg_temp), 2),
                "max_temp": round(float(max_temp), 2),
                "min_temp": round(float(min_temp), 2),
                "anomalies_detected": int(anomalies_count)
            },
            "processed_data": processed_records,
            "forecast": predictions
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Required for local testing
if __name__ == '__main__':
    app.run(port=5328)
