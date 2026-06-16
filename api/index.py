from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
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
        
        # Ensure numeric
        df['timestamp'] = pd.to_numeric(df['timestamp'])
        df['temp'] = pd.to_numeric(df['temp'])
        df['humidity'] = pd.to_numeric(df['humidity'])
        
        df = df.sort_values('timestamp')

        # === 1. Anomaly Detection (Isolation Forest) ===
        features_iso = df[['temp']]
        model_iso = IsolationForest(contamination=0.05, random_state=42)
        df['anomaly'] = model_iso.fit_predict(features_iso)
        df['is_anomaly'] = df['anomaly'] == -1

        # === 2. Clustering (K-Means) ===
        # Cluster the environment into 3 profiles: Cold, Optimal, Hot
        features_cluster = df[['temp', 'humidity']]
        # Determine k based on data size
        k = min(3, len(df))
        model_kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        df['cluster'] = model_kmeans.fit_predict(features_cluster)

        # === 3. Forecasting (Linear Regression) ===
        X = df[['timestamp']].values
        y_temp = df['temp'].values
        
        model_lr = LinearRegression()
        model_lr.fit(X, y_temp)

        time_diffs = np.diff(X.flatten())
        avg_interval = np.mean(time_diffs) if len(time_diffs) > 0 else 60000

        last_time = df['timestamp'].iloc[-1]
        
        predictions = []
        for i in range(1, 13):
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
        processed_records = df[['timestamp', 'temp', 'humidity', 'is_anomaly', 'cluster']].to_dict(orient='records')
        
        for r in processed_records:
            r['is_anomaly'] = bool(r['is_anomaly'])
            r['cluster'] = int(r['cluster'])

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
