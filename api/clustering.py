from sklearn.cluster import KMeans
import numpy as np

def cluster_points(points, n_clusters=3):
    coords = np.array([[p["lat"], p["lon"]] for p in points])
    if len(points) < n_clusters:
        n_clusters = len(points)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(coords)
    for i, lbl in enumerate(labels):
        points[i]["cluster"] = int(lbl)
    return points, kmeans.cluster_centers_.tolist()
