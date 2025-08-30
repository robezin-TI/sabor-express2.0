from typing import List, Dict, Any
import numpy as np
from sklearn.linear_model import LinearRegression

def predict_demand(historical_data: List[float], horizon: int = 3) -> Dict[str, Any]:
    """
    Previsão simples de tendência (regressão linear).
    """
    y = np.array(historical_data, dtype=float)
    X = np.arange(len(y), dtype=float).reshape(-1, 1)

    model = LinearRegression()
    model.fit(X, y)

    future_idx = np.arange(len(y), len(y) + horizon, dtype=float).reshape(-1, 1)
    preds = model.predict(future_idx)

    return {
        "horizon": horizon,
        "predictions": [float(v) for v in preds]
    }
