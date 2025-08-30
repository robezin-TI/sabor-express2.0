# api/ml_model.py
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
import numpy as np

class DeliveryTimeModel:
    """
    Simple wrapper for training and predicting delivery times.
    Stores the trained model in-memory.
    """

    def __init__(self, model_type="rf"):
        self.model_type = model_type
        self.model = None
        self._init_model()

    def _init_model(self):
        if self.model_type == "linear":
            self.model = LinearRegression()
        else:
            self.model = RandomForestRegressor(n_estimators=100, random_state=42)

    def train(self, X, y):
        X = np.array(X, dtype=float)
        y = np.array(y, dtype=float)
        if len(y) == 0:
            raise ValueError("Empty training data")
        self.model.fit(X, y)
        return {"trained": True, "n_samples": len(y)}

    def predict(self, X):
        if self.model is None:
            raise RuntimeError("Model not initialized/trained")
        X = np.array(X, dtype=float)
        preds = self.model.predict(X)
        return preds.tolist()
