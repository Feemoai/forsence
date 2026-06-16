from flask import Flask, request, jsonify
import math
import random

app = Flask(__name__)

def linear_regression(x, y):
    n = len(x)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x_sq = sum(xi ** 2 for xi in x)
    
    denominator = (n * sum_x_sq - sum_x ** 2)
    if denominator == 0:
        return 0, sum_y / n
    
    m = (n * sum_xy - sum_x * sum_y) / denominator
    b = (sum_y - m * sum_x) / n
    return m, b

def z_score_anomaly(y, threshold=2.0):
    n = len(y)
    if n == 0:
        return [False] * n
    mean = sum(y) / n
    variance = sum((yi - mean) ** 2 for yi in y) / n
    std_dev = math.sqrt(variance)
    
    if std_dev == 0:
        return [False] * n
        
    return [abs(yi - mean) / std_dev > threshold for yi in y]

def kmeans_2d(data, k=3, iterations=10):
    if len(data) == 0:
        return []
    if len(data) < k:
        k = len(data)
        
    # Initialize centroids randomly from data points
    centroids = random.sample(data, k)
    clusters = [-1] * len(data)
    
    for _ in range(iterations):
        # Assign clusters
        for i, point in enumerate(data):
            distances = [math.sqrt((point[0] - c[0])**2 + (point[1] - c[1])**2) for c in centroids]
            clusters[i] = distances.index(min(distances))
            
        # Update centroids
        new_centroids = []
        for j in range(k):
            cluster_points = [data[i] for i in range(len(data)) if clusters[i] == j]
            if cluster_points:
                avg_x = sum(p[0] for p in cluster_points) / len(cluster_points)
                avg_y = sum(p[1] for p in cluster_points) / len(cluster_points)
                new_centroids.append((avg_x, avg_y))
            else:
                new_centroids.append(centroids[j])
        centroids = new_centroids
        
    return clusters

@app.route('/api/python', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'records' not in data:
            return jsonify({"error": "No records provided"}), 400

        records = data['records']
        if len(records) < 5:
            return jsonify({"error": "Not enough data points. Minimum 5 required."}), 400

        # Sort by timestamp
        records = sorted(records, key=lambda r: float(r.get('timestamp', 0)))

        # Filter out floating sensor data (0 degrees or impossible temps)
        valid_records = [r for r in records if float(r.get('temp', 0)) > 1.0]
        if len(valid_records) < 5:
            return jsonify({"error": "Not enough valid data points after filtering floating sensor errors (temp 0°C). Minimum 5 required."}), 400

        timestamps = [float(r['timestamp']) for r in valid_records]
        temps = [float(r['temp']) for r in valid_records]
        humidities = [float(r['humidity']) for r in valid_records]

        # 1. Anomaly Detection (Z-Score)
        anomalies = z_score_anomaly(temps, threshold=2.0)

        # 2. Clustering (K-Means)
        # Normalize data for clustering to prevent scale bias
        max_t, min_t = max(temps), min(temps)
        max_h, min_h = max(humidities), min(humidities)
        
        range_t = max_t - min_t if max_t != min_t else 1
        range_h = max_h - min_h if max_h != min_h else 1
        
        normalized_data = [
            ((t - min_t)/range_t, (h - min_h)/range_h) 
            for t, h in zip(temps, humidities)
        ]
        
        clusters = kmeans_2d(normalized_data, k=min(3, len(records)))

        # 3. Forecasting (Linear Regression)
        m, b = linear_regression(timestamps, temps)
        
        time_diffs = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
        avg_interval = sum(time_diffs) / len(time_diffs) if time_diffs else 60000
        last_time = timestamps[-1]
        
        predictions = []
        for i in range(1, 13):
            next_time = last_time + (avg_interval * i)
            pred_temp = m * next_time + b
            predictions.append({
                "timestamp": int(next_time),
                "predicted_temp": round(float(pred_temp), 2)
            })

        # Calculate metrics
        avg_temp = sum(temps) / len(temps)
        anomalies_count = sum(1 for a in anomalies if a)
        max_temp = max(temps)
        min_temp = min(temps)

        # Prepare response
        processed_records = []
        for i, r in enumerate(valid_records):
            processed_records.append({
                "timestamp": int(timestamps[i]),
                "temp": float(temps[i]),
                "humidity": float(humidities[i]),
                "is_anomaly": bool(anomalies[i]),
                "cluster": int(clusters[i])
            })

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

if __name__ == '__main__':
    app.run(port=5328)
