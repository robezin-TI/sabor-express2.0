from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

class DeliveryTimePredictor:
    def __init__(self, model_type="linear"):
        if model_type == "linear":
            self.model = LinearRegression()
        else:
            self.model = RandomForestRegressor(n_estimators=100, random_state=42)

    def train(self, X, y):
        self.model.fit(X, y)

    def predict(self, X):
        return self.model.predict(X).tolist()
