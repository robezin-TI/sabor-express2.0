# api/clustering.py
from sklearn.cluster import KMeans
import numpy as np

def cluster_points(points, n_clusters=3):
    """
    points: list of dicts with keys 'lat' and 'lon'
    returns: (points_with_cluster, centers)
    """
    if not points:
        return [], []

    coords = np.array([[p["lat"], p["lon"]] for p in points], dtype=float)
    n_clusters = max(1, min(n_clusters, len(points)))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    labels = km.fit_predict(coords)
    centers = km.cluster_centers_.tolist()
    for i, p in enumerate(points):
        p["cluster"] = int(labels[i])
    return points, centers
