from typing import List, Dict, Any
import numpy as np
from sklearn.cluster import KMeans

def cluster_points(points: List[Dict[str, float]], k: int = 3) -> Dict[str, Any]:
    """
    Agrupa pontos (lat, lon) em k clusters via KMeans.
    """
    if k < 1:
        k = 1
    X = np.array([[p["lat"], p["lon"]] for p in points], dtype=float)
    km = KMeans(n_clusters=min(k, len(points)), n_init=10, random_state=42)
    labels = km.fit_predict(X)
    centers = km.cluster_centers_.tolist()
    return {
        "labels": labels.tolist(),
        "centers": [{"lat": float(c[0]), "lon": float(c[1])} for c in centers]
    }
